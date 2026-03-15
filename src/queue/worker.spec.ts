import Redis from 'ioredis'
import { describe, expect, it, afterEach } from 'vitest'
import { Queue } from './queue.js'
import { Worker } from './worker.js'
import { delay, quit, rand } from '../test.util.spec.js'
import { decodeJob } from './job.js'
import { resolveCodec } from './codec.js'
import type { DLQEntry } from './types.js'

async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 2000,
  interval = 10,
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await condition()) return
    await delay(interval)
  }
  throw new Error('Timed out waiting for condition')
}

describe('queue worker', () => {
  let workerClient: Redis | null = null
  const cleanups: Array<() => Promise<void>> = []

  afterEach(async () => {
    for (const fn of cleanups.splice(0)) {
      await fn()
    }
    if (workerClient) await quit(workerClient)
    workerClient = null
  })

  it('processes jobs and clears pending', async () => {
    workerClient = new Redis()
    const writer = new Redis()
    cleanups.push(() => quit(writer))

    const stream = `queue-${rand()}`
    const group = `group-${rand()}`
    const queue = new Queue<{ value: number }>(stream, { redis: writer })

    const processed: number[] = []
    const worker = new Worker<{ value: number }>(stream, {
      group,
      redis: workerClient,
      handler: async (job) => {
        processed.push(job.data.value)
      },
    })

    await queue.addBulk([{ value: 1 }, { value: 2 }])

    await waitFor(() => processed.length === 2)
    const pending = await worker.stream.pending()
    expect(pending.count).toBe(0)

    await worker.close(1000)
  })

  it('retries failed jobs and preserves originId', async () => {
    workerClient = new Redis()
    const writer = new Redis()
    cleanups.push(() => quit(writer))

    const stream = `queue-${rand()}`
    const group = `group-${rand()}`
    const queue = new Queue<{ value: number }>(stream, { redis: writer })

    const attempts: number[] = []
    const originIds: string[] = []

    const worker = new Worker<{ value: number }>(stream, {
      group,
      redis: workerClient,
      retries: 1,
      backoff: { strategy: 'fixed', delay: 10 },
      handler: async (job) => {
        attempts.push(job.attempt)
        originIds.push(job.originId)
        if (job.attempt === 0) {
          throw new Error('nope')
        }
      },
    })

    await queue.add({ value: 10 })

    await waitFor(() => attempts.length === 2)
    expect(attempts).toEqual([0, 1])
    expect(originIds[0]).toBe(originIds[1])

    await worker.close(1000)
  })

  it('sends failed jobs to the dlq', async () => {
    workerClient = new Redis()
    const reader = new Redis()
    const writer = new Redis()
    cleanups.push(() => quit(reader))
    cleanups.push(() => quit(writer))

    const stream = `queue-${rand()}`
    const dlq = `${stream}-dlq`
    const group = `group-${rand()}`
    const queue = new Queue<{ value: number }>(stream, { redis: writer })
    const codec = await resolveCodec()

    const worker = new Worker<{ value: number }>(stream, {
      group,
      redis: workerClient,
      retries: 0,
      dlq,
      handler: async () => {
        throw new Error('boom')
      },
    })

    await queue.add({ value: 42 })

    let dlqJob: DLQEntry<{ value: number }> | null = null
    await waitFor(async () => {
      const entries = await reader.xrangeBuffer(dlq, '-', '+', 'COUNT', 1)
      if (!entries || entries.length === 0) return false
      const [entryId, kv] = entries[0] as [Buffer, Buffer[]]
      const decoded = decodeJob<DLQEntry<{ value: number }>>(entryId.toString(), dlq, kv, codec)
      if ('parseError' in decoded) throw decoded.parseError
      dlqJob = decoded.job.data
      return true
    })

    expect(dlqJob).not.toBeNull()
    if (!dlqJob) throw new Error('Missing DLQ entry')
    const dlqData = dlqJob as DLQEntry<{ value: number }>
    expect(dlqData.error).toBe('boom')
    expect(dlqData.originalStream).toBe(stream)

    await worker.close(1000)
  })

  it('re-adds retrying jobs when closed during backoff', async () => {
    workerClient = new Redis()
    const reader = new Redis()
    const writer = new Redis()
    cleanups.push(() => quit(reader))
    cleanups.push(() => quit(writer))

    const stream = `queue-${rand()}`
    const group = `group-${rand()}`
    const queue = new Queue<{ value: number }>(stream, { redis: writer })
    const codec = await resolveCodec()

    let handlerCalled = false
    const worker = new Worker<{ value: number }>(stream, {
      group,
      redis: workerClient,
      retries: 1,
      backoff: { strategy: 'fixed', delay: 60_000 },
      handler: async () => {
        handlerCalled = true
        throw new Error('fail')
      },
    })

    await queue.add({ value: 99 })
    await waitFor(() => handlerCalled)

    await worker.close(5000)

    const entries = await reader.xrangeBuffer(stream, '-', '+')
    expect(entries.length).toBeGreaterThanOrEqual(1)

    const last = entries[entries.length - 1] as [Buffer, Buffer[]]
    const decoded = decodeJob<{ value: number }>(last[0].toString(), stream, last[1], codec)
    expect('job' in decoded).toBe(true)
    if ('job' in decoded) {
      expect(decoded.job.attempt).toBe(1)
      expect(decoded.job.data.value).toBe(99)
    }
  })

  it('emits error for failed forwards without throwing', async () => {
    workerClient = new Redis()
    const writer = new Redis()
    cleanups.push(() => quit(writer))

    const stream = `queue-${rand()}`
    const group = `group-${rand()}`
    const badKey = `queue-bad-${rand()}`
    const queue = new Queue<{ value: number }>(stream, { redis: writer })

    await writer.set(badKey, 'not-a-stream')

    const completedEvents: number[] = []
    const errors: Error[] = []

    const worker = new Worker<{ value: number }>(stream, {
      group,
      redis: workerClient,
      handler: async (_job, ctx) => {
        ctx.forward(badKey, { routed: true })
      },
    })

    worker.on('completed', (job) => completedEvents.push(job.data.value))
    worker.on('error', (err) => errors.push(err))

    await queue.add({ value: 1 })

    await waitFor(() => completedEvents.length === 1)
    await delay(50)

    expect(completedEvents).toEqual([1])
    expect(errors.length).toBeGreaterThanOrEqual(1)
    expect(errors[0]!.message).toMatch(/WRONGTYPE/)

    await worker.close(1000)
    await writer.del(badKey)
  })

  it('waits for retry re-enqueue before closing connections', async () => {
    workerClient = new Redis()
    const reader = new Redis()
    const writer = new Redis()
    cleanups.push(() => quit(reader))
    cleanups.push(() => quit(writer))

    const stream = `queue-${rand()}`
    const group = `group-${rand()}`
    const queue = new Queue<{ value: number }>(stream, { redis: writer })
    const codec = await resolveCodec()

    let started = false
    const worker = new Worker<{ value: number }>(stream, {
      group,
      redis: workerClient,
      retries: 1,
      backoff: { strategy: 'fixed', delay: 60_000 },
      handler: async (_job, ctx) => {
        started = true
        await new Promise<void>((resolve) => {
          if (ctx.signal.aborted) return resolve()
          ctx.signal.addEventListener('abort', () => resolve(), { once: true })
        })
        throw new Error('close-race')
      },
    })

    const retryWriter = (worker as unknown as { writer: Redis }).writer
    const originalXadd = retryWriter.xadd.bind(retryWriter)
    retryWriter.xadd = (async (...args: Parameters<Redis['xadd']>) => {
      await delay(100)
      return originalXadd(...args)
    }) as Redis['xadd']

    await queue.add({ value: 5 })
    await waitFor(() => started)

    await worker.close(5000)

    const entries = await reader.xrangeBuffer(stream, '-', '+')
    expect(entries.length).toBeGreaterThanOrEqual(1)

    const last = entries[entries.length - 1] as [Buffer, Buffer[]]
    const decoded = decodeJob<{ value: number }>(last[0].toString(), stream, last[1], codec)
    expect('job' in decoded).toBe(true)
    if ('job' in decoded) {
      expect(decoded.job.attempt).toBe(1)
      expect(decoded.job.data.value).toBe(5)
    }
  })
})
