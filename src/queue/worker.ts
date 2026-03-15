import { EventEmitter } from 'events'
import { RedisStream } from '../stream.js'
import type { RedisClient, StreamInfo, GroupInfo, ConsumerInfo, PendingSummary } from '../types.js'
import { resolveCodec } from './codec.js'
import { decodeJob, encodeJob } from './job.js'
import type {
  BackoffOptions,
  Codec,
  Context,
  DLQEntry,
  Handler,
  Job,
  JobMeta,
  WorkerEvents,
  WorkerOptions,
} from './types.js'

type ForwardEntry = {
  stream: string
  data: unknown
  meta: JobMeta
}

class Semaphore {
  private readonly max: number
  private current = 0
  private readonly queue: Array<(release: () => void) => void> = []

  constructor(max: number) {
    this.max = Math.max(1, max)
  }

  public acquire(): Promise<() => void> {
    if (this.current < this.max) {
      this.current += 1
      return Promise.resolve(this.releaseFactory())
    }
    return new Promise((resolve) => {
      this.queue.push(resolve)
    })
  }

  private releaseFactory(): () => void {
    let released = false
    return () => {
      if (released) return
      released = true
      this.current -= 1
      const next = this.queue.shift()
      if (next) {
        this.current += 1
        next(this.releaseFactory())
      }
    }
  }
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function toBufferArray(values: unknown): Buffer[] {
  if (!Array.isArray(values)) return []
  return values.map((value) => {
    if (Buffer.isBuffer(value)) return value
    if (typeof value === 'string') return Buffer.from(value)
    return Buffer.from(String(value))
  })
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      resolve()
    }
    signal.addEventListener('abort', onAbort, { once: true })
    timer.unref?.()
  })
}

export class Worker<T> extends EventEmitter {
  public readonly stream: RedisStream

  private readonly name: string
  private readonly handler: Handler<T>
  private codec!: Codec
  private readonly writer: RedisClient
  private readonly concurrency: number
  private readonly retries: number
  private readonly backoff?: BackoffOptions
  private readonly dlq?: string
  private readonly output?: string

  private readonly semaphore: Semaphore
  private readonly inFlight = new Set<Promise<void>>()
  private readonly retryTasks = new Set<Promise<void>>()
  private readonly abortController = new AbortController()

  private paused = false
  private resumePromise: Promise<void> | null = null
  private resumeResolver: (() => void) | null = null
  private closePromise: Promise<void> | null = null
  private pumpPromise: Promise<void> | null = null

  constructor(name: string, options: WorkerOptions<T>) {
    super()

    if (!options.group) {
      throw new Error('Worker requires a consumer group')
    }

    this.name = name
    this.handler = options.handler
    this.concurrency = Math.max(1, options.concurrency ?? 1)
    this.retries = Math.max(0, options.retries ?? 0)
    this.backoff = options.backoff
    this.dlq = options.dlq
    this.output = options.output
    this.semaphore = new Semaphore(this.concurrency)

    const count = options.count ?? this.concurrency
    const block = typeof options.block === 'number' ? options.block : Infinity

    this.stream = new RedisStream({
      stream: name,
      group: options.group,
      consumer: options.consumer,
      buffers: true,
      block,
      count,
      redis: options.redis,
      claimIdleTime: options.claimIdleTime,
      deleteOnAck: options.deleteOnAck,
      flushPendingAckInterval: options.flushPendingAckInterval,
      ackOnIterate: false,
    })

    this.writer = this.stream.control ?? this.stream.client

    this.stream.on('ready', () => this.emit('ready'))
    this.stream.on('error', (error) => this.emit('error', error))

    this.pumpPromise = resolveCodec(options.codec)
      .then((codec) => {
        this.codec = codec
        return this.pump()
      })
      .catch((error) => {
        this.emit('error', normalizeError(error))
        if (!this.closePromise) {
          void this.close()
        }
      })
  }

  public override on<K extends keyof WorkerEvents<T>>(
    event: K,
    listener: WorkerEvents<T>[K],
  ): this {
    return super.on(event, listener)
  }

  public override emit<K extends keyof WorkerEvents<T>>(
    event: K,
    ...args: Parameters<WorkerEvents<T>[K]>
  ): boolean {
    return super.emit(event, ...args)
  }

  public pause(): void {
    if (this.paused) return
    this.paused = true
    this.resumePromise = new Promise((resolve) => {
      this.resumeResolver = resolve
    })
  }

  public resume(): void {
    if (!this.paused) return
    this.paused = false
    this.resumeResolver?.()
    this.resumeResolver = null
    this.resumePromise = null
  }

  // ---- Observability ----

  /** Returns XINFO STREAM for the worker's stream. */
  public async info(): Promise<Map<string, StreamInfo>> {
    return this.stream.info()
  }

  /** Returns XINFO GROUPS for the worker's stream. */
  public async groups(): Promise<GroupInfo[]> {
    return this.stream.groups()
  }

  /** Returns XINFO CONSUMERS for the worker's consumer group. */
  public async consumers(): Promise<ConsumerInfo[]> {
    return this.stream.consumers()
  }

  /** Returns the XPENDING summary for the worker's consumer group. */
  public async pending(): Promise<PendingSummary> {
    return this.stream.pending()
  }

  public async close(timeout?: number): Promise<void> {
    if (this.closePromise) return this.closePromise
    this.closePromise = this.performClose(timeout)
    return this.closePromise
  }

  private async performClose(timeout?: number): Promise<void> {
    this.resume()
    this.abortController.abort()

    try {
      await this.stream.drain()
    } catch (error) {
      this.emit('error', normalizeError(error))
    }

    if (this.pumpPromise) {
      await this.pumpPromise
    }

    const settled = await this.waitForSettle(timeout)
    if (!settled) {
      await this.forceClose()
      this.emit('closed')
      return
    }

    await this.forceClose()
    this.emit('closed')
  }

  private async forceClose(): Promise<void> {
    try {
      await this.stream.quit()
    } catch (error) {
      this.emit('error', normalizeError(error))
    }
  }

  private async waitForSettle(timeout?: number): Promise<boolean> {
    const deadline = timeout == null ? null : Date.now() + timeout

    while (true) {
      const tasks = [...this.inFlight, ...this.retryTasks]
      if (tasks.length === 0) return true

      const settle = Promise.allSettled(tasks).then(() => true)
      if (deadline == null) {
        await settle
        continue
      }

      const remaining = deadline - Date.now()
      if (remaining <= 0) return false

      const timed = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), remaining).unref?.()
      })

      const settled = await Promise.race([settle, timed])
      if (!settled) return false
    }
  }

  private async pump(): Promise<void> {
    const iterator = this.stream[Symbol.asyncIterator]()
    try {
      while (true) {
        if (this.paused && this.resumePromise) {
          await this.resumePromise
        }

        const release = await this.semaphore.acquire()
        let next
        try {
          next = await iterator.next()
        } catch (error) {
          release()
          throw error
        }

        if (next.done) {
          release()
          break
        }

        const [streamKey, [entryId, kv]] = next.value
        const task = this.handleEntry(streamKey, entryId, kv, release)
        this.inFlight.add(task)
        task
          .catch((error) => {
            this.emit('error', normalizeError(error))
          })
          .finally(() => this.inFlight.delete(task))
      }
    } finally {
      if (iterator.return) {
        try {
          await iterator.return()
        } catch (error) {
          this.emit('error', normalizeError(error))
        }
      }
    }
  }

  private async handleEntry(
    streamKey: string,
    entryId: string | Buffer,
    kv: unknown,
    release: () => void,
  ): Promise<void> {
    try {
      const id = Buffer.isBuffer(entryId) ? entryId.toString() : entryId
      const decoded = decodeJob<T>(id, streamKey, toBufferArray(kv), this.codec)

      if ('parseError' in decoded) {
        await this.handleParseError(streamKey, id, decoded.raw, decoded.parseError)
        return
      }

      const job = decoded.job
      const forwards: ForwardEntry[] = []
      const ctx: Context = {
        forward: (stream, data) => {
          forwards.push({
            stream,
            data,
            meta: this.baseMeta(),
          })
        },
        signal: this.abortController.signal,
      }

      let result: unknown
      try {
        result = await this.handler(job, ctx)
      } catch (error) {
        await this.handleFailure(streamKey, id, job, normalizeError(error))
        return
      }

      await this.handleSuccess(streamKey, id, job, result, forwards)
    } finally {
      release()
    }
  }

  private async handleSuccess(
    streamKey: string,
    entryId: string,
    job: Job<T>,
    result: unknown,
    forwards: ForwardEntry[],
  ): Promise<void> {
    if (this.output && result !== undefined) {
      forwards.push({
        stream: this.output,
        data: result,
        meta: this.baseMeta(),
      })
    }

    await this.ackAndEnqueue(streamKey, entryId, forwards)
    this.emit('completed', job, result)
  }

  private async handleFailure(
    streamKey: string,
    entryId: string,
    job: Job<T>,
    error: Error,
  ): Promise<void> {
    if (job.attempt < this.retries) {
      const nextAttempt = job.attempt + 1
      const meta: JobMeta = {
        attempt: nextAttempt,
        createdAt: job.createdAt,
        originId: job.originId,
      }
      this.emit('retrying', job, error, nextAttempt)
      if (this.abortController.signal.aborted) {
        await this.retryAfter(streamKey, entryId, job.data, meta, 0)
      } else {
        this.scheduleRetry(streamKey, entryId, job, meta)
      }
      return
    }

    if (this.dlq) {
      const dlqEntry: DLQEntry<T> = {
        data: job.data,
        error: error.message,
        originalId: job.originId,
        originalStream: streamKey,
        attempt: job.attempt,
        failedAt: Date.now(),
        createdAt: job.createdAt,
      }
      await this.ackAndEnqueue(streamKey, entryId, [
        {
          stream: this.dlq,
          data: dlqEntry,
          meta: this.baseMeta(),
        },
      ])
    } else {
      await this.ackAndEnqueue(streamKey, entryId, [])
    }

    this.emit('failed', job, error)
  }

  private async handleParseError(
    streamKey: string,
    entryId: string,
    raw: Buffer[],
    error: Error,
  ): Promise<void> {
    if (this.dlq) {
      const dlqEntry: DLQEntry<T> = {
        data: raw.map((value) => value.toString('utf8')),
        parseError: true,
        error: error.message,
        originalId: entryId,
        originalStream: streamKey,
        attempt: 0,
        failedAt: Date.now(),
        createdAt: Date.now(),
      }
      await this.ackAndEnqueue(streamKey, entryId, [
        {
          stream: this.dlq,
          data: dlqEntry,
          meta: this.baseMeta(),
        },
      ])
    } else {
      await this.ackAndEnqueue(streamKey, entryId, [])
    }

    this.emit('error', error)
  }

  private async ackAndEnqueue(
    streamKey: string,
    entryId: string,
    adds: ForwardEntry[],
  ): Promise<void> {
    const group = this.stream.group
    if (!group) throw new Error('Worker requires a consumer group')

    const pipeline = this.writer.pipeline()
    pipeline.xack(streamKey, group, entryId)
    if (this.stream.deleteOnAck) {
      pipeline.xdel(streamKey, entryId)
    }

    const ackCommands = this.stream.deleteOnAck ? 2 : 1

    for (const entry of adds) {
      const [dataBuffer, metaBuffer] = encodeJob(entry.data, entry.meta, this.codec)
      pipeline.xadd(entry.stream, '*', 'd', dataBuffer, 'm', metaBuffer)
    }

    const results = await pipeline.exec()
    if (!results) return

    // Check ack/del commands — these are fatal
    for (let i = 0; i < ackCommands; i++) {
      const [error] = results[i]!
      if (error) throw error
    }

    // Check forward commands — emit errors individually so one failed
    // forward doesn't mask others that succeeded, and the caller knows
    // the ack already landed.
    for (let i = ackCommands; i < results.length; i++) {
      const [error] = results[i]!
      if (error) {
        this.emit('error', normalizeError(error))
      }
    }
  }

  private scheduleRetry(streamKey: string, entryId: string, job: Job<T>, meta: JobMeta): void {
    const delay = this.getBackoffDelay(job.attempt)

    const task = this.retryAfter(streamKey, entryId, job.data, meta, delay)
    this.retryTasks.add(task)
    task.finally(() => this.retryTasks.delete(task))
  }

  private async retryAfter(
    streamKey: string,
    entryId: string,
    data: T,
    meta: JobMeta,
    delay: number,
  ): Promise<void> {
    await wait(delay, this.abortController.signal)

    try {
      await this.enqueue(streamKey, data, meta)
      await this.ackAndEnqueue(streamKey, entryId, [])
    } catch (error) {
      this.emit('error', normalizeError(error))
    }
  }

  private async enqueue(streamKey: string, data: unknown, meta: JobMeta): Promise<string> {
    const [dataBuffer, metaBuffer] = encodeJob(data, meta, this.codec)
    const id = await this.writer.xadd(streamKey, '*', 'd', dataBuffer, 'm', metaBuffer)
    if (!id) throw new Error('Unable to enqueue job')
    return id
  }

  private getBackoffDelay(attempt: number): number {
    if (!this.backoff) return 0
    const { strategy, delay, maxDelay = 30000 } = this.backoff
    if (strategy === 'fixed') return delay
    return Math.min(delay * 2 ** attempt, maxDelay)
  }

  private baseMeta(): JobMeta {
    return {
      attempt: 0,
      createdAt: Date.now(),
    }
  }
}
