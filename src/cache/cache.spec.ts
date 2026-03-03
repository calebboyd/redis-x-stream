import Redis from 'ioredis'
import { describe, expect, it, afterEach } from 'vitest'
import { SingleFlightCache } from './cache.js'
import { delay, quit, rand } from '../test.util.spec.js'

async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 3000,
  interval = 10,
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await condition()) return
    await delay(interval)
  }
  throw new Error('Timed out waiting for condition')
}

describe('SingleFlightCache', () => {
  const cleanups: Array<() => Promise<void>> = []

  afterEach(async () => {
    for (const fn of cleanups.splice(0)) {
      await fn()
    }
  })

  it('fetches on cache miss and returns the value', async () => {
    const prefix = `sfc-${rand()}:`
    const stream = `results-${rand()}`
    let fetchCount = 0

    const cache = new SingleFlightCache<{ n: number }>({
      fetcher: async () => {
        fetchCount++
        return { n: 42 }
      },
      keyPrefix: prefix,
      resultStream: stream,
      timeout: 2000,
    })
    cleanups.push(() => cache.close())

    const result = await cache.get('key1')
    expect(result).toEqual({ n: 42 })
    expect(fetchCount).toBe(1)

    // Second get should hit local cache
    const result2 = await cache.get('key1')
    expect(result2).toEqual({ n: 42 })
    expect(fetchCount).toBe(1)
  })

  it('coalesces concurrent requests for the same key', async () => {
    const prefix = `sfc-${rand()}:`
    const stream = `results-${rand()}`
    let fetchCount = 0

    const cache = new SingleFlightCache<{ n: number }>({
      fetcher: async () => {
        fetchCount++
        await delay(100)
        return { n: 99 }
      },
      keyPrefix: prefix,
      resultStream: stream,
      timeout: 2000,
    })
    cleanups.push(() => cache.close())

    // Fire 5 concurrent gets -- only 1 fetch should happen
    const results = await Promise.all([
      cache.get('coalesce'),
      cache.get('coalesce'),
      cache.get('coalesce'),
      cache.get('coalesce'),
      cache.get('coalesce'),
    ])

    for (const r of results) {
      expect(r).toEqual({ n: 99 })
    }
    expect(fetchCount).toBe(1)
  })

  it('serves from Redis cache on second miss after local TTL expires', async () => {
    const prefix = `sfc-${rand()}:`
    const stream = `results-${rand()}`
    let fetchCount = 0

    const cache = new SingleFlightCache<{ n: number }>({
      fetcher: async () => {
        fetchCount++
        return { n: 7 }
      },
      keyPrefix: prefix,
      resultStream: stream,
      localTtl: 50,
      timeout: 2000,
    })
    cleanups.push(() => cache.close())

    await cache.get('ttl-key')
    expect(fetchCount).toBe(1)

    // Wait for local TTL to expire
    await delay(80)

    const hits: string[] = []
    cache.on('hit', (_key, source) => hits.push(source))

    const result = await cache.get('ttl-key')
    expect(result).toEqual({ n: 7 })
    // Should hit Redis cache, not fetch again
    expect(hits).toContain('redis')
    expect(fetchCount).toBe(1)
  })

  it('invalidates local and Redis cache and broadcasts tombstone', async () => {
    const prefix = `sfc-${rand()}:`
    const stream = `results-${rand()}`
    let fetchCount = 0

    const cache = new SingleFlightCache<{ n: number }>({
      fetcher: async () => {
        fetchCount++
        return { n: fetchCount }
      },
      keyPrefix: prefix,
      resultStream: stream,
      timeout: 2000,
    })
    cleanups.push(() => cache.close())

    const first = await cache.get('inv-key')
    expect(first).toEqual({ n: 1 })

    await cache.invalidate('inv-key')

    // Next get should trigger a fresh fetch
    const second = await cache.get('inv-key')
    expect(second).toEqual({ n: 2 })
    expect(fetchCount).toBe(2)
  })

  it('manual set() updates local and Redis cache', async () => {
    const prefix = `sfc-${rand()}:`
    const stream = `results-${rand()}`

    const cache = new SingleFlightCache<{ n: number }>({
      fetcher: async () => ({ n: -1 }),
      keyPrefix: prefix,
      resultStream: stream,
      timeout: 2000,
    })
    cleanups.push(() => cache.close())

    await cache.set('manual', { n: 777 })

    const result = await cache.get('manual')
    expect(result).toEqual({ n: 777 })
  })

  it('times out and retries when fetcher is very slow', async () => {
    const prefix = `sfc-${rand()}:`
    const stream = `results-${rand()}`
    let fetchCount = 0

    const cache = new SingleFlightCache<{ n: number }>({
      fetcher: async () => {
        fetchCount++
        if (fetchCount === 1) {
          // First fetch is very slow -- simulate by never resolving
          return new Promise(() => {})
        }
        return { n: 200 }
      },
      keyPrefix: prefix,
      resultStream: stream,
      timeout: 200,
      lockTtl: 1000, // 1 second in ms
    })
    cleanups.push(() => cache.close())

    // The first fetch hangs. Timeout fires, retries, acquires lock
    // (original lock expired after 1s, but timeout is 200ms so the
    // retry happens, and with lockTtl=1000ms the lock expires quickly).
    // With lockTtl=1000 the lock expires after 1 second, but the timeout
    // at 200ms will try to get from Redis (miss), then try lock again.
    // The lock is still held (1s > 200ms), so it rejects.
    await expect(cache.get('slow')).rejects.toThrow(/timeout/)
  })

  it('broadcasts results to a second cache instance via stream', async () => {
    const prefix = `sfc-${rand()}:`
    const stream = `results-${rand()}`
    let fetchCount = 0

    // Cache A -- the fetcher
    const cacheA = new SingleFlightCache<{ n: number }>({
      fetcher: async () => {
        fetchCount++
        return { n: 500 }
      },
      keyPrefix: prefix,
      resultStream: stream,
      timeout: 3000,
    })
    cleanups.push(() => cacheA.close())

    // Cache B -- simulates another pod
    const cacheB = new SingleFlightCache<{ n: number }>({
      fetcher: async () => {
        fetchCount++
        return { n: -1 }
      },
      keyPrefix: prefix,
      resultStream: stream,
      timeout: 3000,
    })
    cleanups.push(() => cacheB.close())

    // Give listeners time to connect
    await delay(100)

    // Cache A fetches and writes to Redis + stream
    const resultA = await cacheA.get('broadcast-key')
    expect(resultA).toEqual({ n: 500 })

    // Cache B should get the value from Redis cache (written by A's Lua script)
    const resultB = await cacheB.get('broadcast-key')
    expect(resultB).toEqual({ n: 500 })

    // Only 1 fetch total (from cache A)
    expect(fetchCount).toBe(1)
  })

  it('emits events for hits, misses, and refreshes', async () => {
    const prefix = `sfc-${rand()}:`
    const stream = `results-${rand()}`

    const cache = new SingleFlightCache<{ n: number }>({
      fetcher: async () => ({ n: 1 }),
      keyPrefix: prefix,
      resultStream: stream,
      timeout: 2000,
    })
    cleanups.push(() => cache.close())

    const events: string[] = []
    cache.on('miss', () => events.push('miss'))
    cache.on('refresh', () => events.push('refresh'))
    cache.on('hit', (_key, source) => events.push(`hit:${source}`))

    await cache.get('evt-key') // miss + refresh

    // Events are emitted synchronously during the get flow
    expect(events).toContain('miss')
    expect(events).toContain('refresh')

    // Second get should hit local cache
    await cache.get('evt-key')
    expect(events).toContain('hit:local')
  })

  it('emits hit:stream when a value is resolved via the broadcast stream', async () => {
    const prefix = `sfc-${rand()}:`
    const stream = `results-${rand()}`

    const cacheA = new SingleFlightCache<{ n: number }>({
      fetcher: async () => ({ n: 42 }),
      keyPrefix: prefix,
      resultStream: stream,
      timeout: 3000,
      localTtl: 10,
    })
    cleanups.push(() => cacheA.close())

    const cacheB = new SingleFlightCache<{ n: number }>({
      fetcher: async () => ({ n: -1 }),
      keyPrefix: prefix,
      resultStream: stream,
      timeout: 3000,
      localTtl: 10,
    })
    cleanups.push(() => cacheB.close())

    await delay(100)

    // Populate via cache A
    await cacheA.get('stream-hit')

    // Wait for local TTL to expire on both instances so a second get
    // won't be served from the local cache.
    await delay(30)

    // Cache B's listener should have received the stream message.
    // Its local cache is expired, so a get() will go to Redis -> hit.
    // But we also want to verify the stream path emits 'stream'.
    const hits: string[] = []
    cacheB.on('hit', (_key, source) => hits.push(source))

    // Use set() on A to broadcast a new value via stream
    await cacheA.set('stream-hit', { n: 99 })

    // Give the stream listener time to deliver
    await waitFor(() => {
      const local = (cacheB as any).localCache.get('stream-hit')
      return local && local.value.n === 99
    })

    expect(hits).toContain('stream')
  })

  it('rejects with fetch timeout when retry fetch hangs', async () => {
    const prefix = `sfc-${rand()}:`
    const stream = `results-${rand()}`
    let fetchCount = 0

    const cache = new SingleFlightCache<{ n: number }>({
      fetcher: async () => {
        fetchCount++
        // Every fetch hangs forever
        return new Promise(() => {})
      },
      keyPrefix: prefix,
      resultStream: stream,
      timeout: 150,
      lockTtl: 1000, // 1 second in ms — lock expires quickly so retry can acquire it
    })
    cleanups.push(() => cache.close())

    // The first fetch hangs, timeout fires, retry acquires lock,
    // retry fetch also hangs, the retry timeout rejects.
    await expect(cache.get('hang-key')).rejects.toThrow(/timeout/)
  })

  it('rejects pending waiters on close()', async () => {
    const prefix = `sfc-${rand()}:`
    const stream = `results-${rand()}`

    const cache = new SingleFlightCache<{ n: number }>({
      fetcher: async () => {
        await delay(5000) // very slow
        return { n: 1 }
      },
      keyPrefix: prefix,
      resultStream: stream,
      timeout: 10_000,
    })

    // Catch the rejection before close to avoid unhandled rejection warning
    const promise = cache.get('close-key').catch((err) => err)
    // Give the fetch flow time to start
    await delay(50)
    await cache.close()

    const err = await promise
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toMatch(/closed/)
  })

  // ---- New feature tests ----

  it('peek() returns local value without triggering a fetch', async () => {
    const prefix = `sfc-${rand()}:`
    const stream = `results-${rand()}`

    const cache = new SingleFlightCache<{ n: number }>({
      fetcher: async () => ({ n: 1 }),
      keyPrefix: prefix,
      resultStream: stream,
      timeout: 2000,
      localTtl: 50,
    })
    cleanups.push(() => cache.close())

    // Before any get, peek returns undefined
    expect(cache.peek('peek-key')).toBeUndefined()

    // After get, peek returns the cached value
    await cache.get('peek-key')
    expect(cache.peek('peek-key')).toEqual({ n: 1 })

    // After local TTL expires, peek returns undefined
    await delay(80)
    expect(cache.peek('peek-key')).toBeUndefined()
  })

  it('clear() removes all entries from the local cache', async () => {
    const prefix = `sfc-${rand()}:`
    const stream = `results-${rand()}`
    let fetchCount = 0

    const cache = new SingleFlightCache<{ n: number }>({
      fetcher: async () => {
        fetchCount++
        return { n: fetchCount }
      },
      keyPrefix: prefix,
      resultStream: stream,
      timeout: 2000,
    })
    cleanups.push(() => cache.close())

    await cache.get('clear-a')
    await cache.get('clear-b')
    expect(cache.peek('clear-a')).toEqual({ n: 1 })
    expect(cache.peek('clear-b')).toEqual({ n: 2 })

    cache.clear()

    // Local cache is empty but Redis still has the values
    expect(cache.peek('clear-a')).toBeUndefined()
    expect(cache.peek('clear-b')).toBeUndefined()

    // Re-fetching should hit Redis, not the fetcher again
    const hits: string[] = []
    cache.on('hit', (_key, source) => hits.push(source))
    await cache.get('clear-a')
    expect(hits).toContain('redis')
  })

  it('maxSize evicts least-recently-used entries', async () => {
    const prefix = `sfc-${rand()}:`
    const stream = `results-${rand()}`

    const cache = new SingleFlightCache<{ n: number }>({
      fetcher: async (key) => ({ n: Number(key.replace('lru-', '')) }),
      keyPrefix: prefix,
      resultStream: stream,
      timeout: 2000,
      maxSize: 3,
    })
    cleanups.push(() => cache.close())

    // Fill the cache to capacity
    await cache.get('lru-1')
    await cache.get('lru-2')
    await cache.get('lru-3')
    expect(cache.peek('lru-1')).toEqual({ n: 1 })
    expect(cache.peek('lru-2')).toEqual({ n: 2 })
    expect(cache.peek('lru-3')).toEqual({ n: 3 })

    // Adding a 4th entry evicts the oldest (lru-1)
    await cache.get('lru-4')
    expect(cache.peek('lru-1')).toBeUndefined()
    expect(cache.peek('lru-4')).toEqual({ n: 4 })

    // Accessing lru-2 makes it recently used — lru-3 becomes oldest
    await cache.get('lru-2')
    await cache.get('lru-5')
    expect(cache.peek('lru-3')).toBeUndefined()
    expect(cache.peek('lru-2')).toEqual({ n: 2 })
  })

  it('get() rejects when an AbortSignal is already aborted', async () => {
    const prefix = `sfc-${rand()}:`
    const stream = `results-${rand()}`

    const cache = new SingleFlightCache<{ n: number }>({
      fetcher: async () => ({ n: 1 }),
      keyPrefix: prefix,
      resultStream: stream,
      timeout: 2000,
    })
    cleanups.push(() => cache.close())

    const controller = new AbortController()
    controller.abort(new Error('pre-aborted'))

    await expect(cache.get('abort-key', { signal: controller.signal })).rejects.toThrow(
      /pre-aborted/,
    )
  })

  it('get() rejects a single waiter when its signal fires without affecting others', async () => {
    const prefix = `sfc-${rand()}:`
    const stream = `results-${rand()}`

    const cache = new SingleFlightCache<{ n: number }>({
      fetcher: async () => {
        await delay(200)
        return { n: 42 }
      },
      keyPrefix: prefix,
      resultStream: stream,
      timeout: 3000,
    })
    cleanups.push(() => cache.close())

    const controller = new AbortController()

    // Two concurrent gets — one with a signal, one without
    const p1 = cache.get('shared-key')
    const p2 = cache.get('shared-key', { signal: controller.signal }).catch((err) => err)

    // Abort after a short delay — only p2 should reject
    await delay(50)
    controller.abort(new Error('cancelled'))

    const err = await p2
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toMatch(/cancelled/)

    // p1 should still resolve normally
    const result = await p1
    expect(result).toEqual({ n: 42 })
  })

  it('passes AbortSignal to the fetcher on close()', async () => {
    const prefix = `sfc-${rand()}:`
    const stream = `results-${rand()}`
    let receivedSignal: AbortSignal | null = null

    const cache = new SingleFlightCache<{ n: number }>({
      fetcher: async (_key, { signal }) => {
        receivedSignal = signal
        await delay(5000)
        return { n: 1 }
      },
      keyPrefix: prefix,
      resultStream: stream,
      timeout: 10_000,
    })

    const promise = cache.get('signal-key').catch(() => {})
    await delay(50)

    expect(receivedSignal).not.toBeNull()
    expect(receivedSignal!.aborted).toBe(false)

    await cache.close()
    await promise

    expect(receivedSignal!.aborted).toBe(true)
  })
})
