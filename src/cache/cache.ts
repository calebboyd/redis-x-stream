import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import { RedisStream } from '../stream.js'
import { closeClient, createClient } from '../redis.js'
import { resolveCodec } from '../queue/codec.js'
import { CACHE_GET, CACHE_SET, CACHE_INVALIDATE, CACHE_EXTEND_LOCK } from './lua.js'
import type { RedisClient, RedisOptions } from '../types.js'
import type { Codec } from '../queue/types.js'
import type { SingleFlightCacheOptions, CacheEvents, StreamResult } from './types.js'

function normalizeError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err))
}

// Typed as ParseFn (kv: string[]) but called with buffers: true at runtime,
// so kv entries are actually Buffers.  toString() works for both types; the
// only place the difference matters is the raw value extraction below.
function parseStreamResult(_id: string, kv: Buffer[] | string[]): StreamResult {
  let key: string | undefined
  let type: string | undefined
  let value: Buffer | undefined
  for (let i = 0; i < kv.length; i += 2) {
    const field = kv[i]?.toString()
    if (field === 'k') key = kv[i + 1]?.toString()
    else if (field === 't') type = kv[i + 1]?.toString()
    // buffers: true yields Buffer[] at runtime
    else if (field === 'v') value = kv[i + 1] as unknown as Buffer
  }
  return {
    key: key ?? '',
    type: (type ?? 'value') as StreamResult['type'],
    value,
  }
}

interface Waiter<T> {
  resolve: (value: T) => void
  reject: (error: Error) => void
  /** Removes the abort listener when the entry is resolved/rejected. */
  cleanup?: () => void
}

interface PendingEntry<T> {
  waiters: Waiter<T>[]
  timer: ReturnType<typeof setTimeout> | null
  resolved: boolean
  /** True when this instance won the lock and is executing the fetch. */
  fetchedLocally: boolean
}

export class SingleFlightCache<T> extends EventEmitter {
  public readonly listener: RedisStream<StreamResult>

  private readonly fetcher: (key: string, options: { signal: AbortSignal }) => Promise<T>
  private codec!: Codec
  private readonly codecReady: Promise<Codec>
  private readonly client: RedisClient
  private readonly createdClient: boolean
  private readonly localTtl: number
  private readonly redisTtl: number
  private readonly lockTtl: number
  private readonly resultStream: string
  private readonly resultMaxLen: number
  private readonly timeout: number
  private readonly extendLock: boolean
  private readonly keyPrefix: string
  private readonly maxSize: number | undefined
  private readonly abortController = new AbortController()

  private readonly localCache = new Map<string, { value: T; expiresAt: number }>()
  private readonly pending = new Map<string, PendingEntry<T>>()
  private closed = false
  private listenerPromise: Promise<void>

  constructor(options: SingleFlightCacheOptions<T>) {
    super()
    this.fetcher = options.fetcher
    this.codecReady = resolveCodec(options.codec).then((c) => {
      this.codec = c
      return c
    })
    this.localTtl = options.localTtl ?? 60_000
    this.redisTtl = options.redisTtl ?? 300_000
    this.lockTtl = options.lockTtl ?? 30_000
    this.resultStream = options.resultStream ?? 'cache:results'
    this.resultMaxLen = options.resultMaxLen ?? 10_000
    this.timeout = options.timeout ?? 5_000
    this.extendLock = options.extendLock ?? false
    this.keyPrefix = options.keyPrefix ?? 'sfc:'
    this.maxSize = options.maxSize

    const redisConfig = SingleFlightCache.resolveRedisConfig(options.redis)
    const { client, created } = createClient(redisConfig)
    this.client = client
    this.createdClient = created
    this.client.on('ready', () => this.emit('ready'))
    this.client.on('error', (err: Error) => this.emit('error', err))

    this.listener = new RedisStream<StreamResult>({
      streams: { [this.resultStream]: '$' },
      block: Infinity,
      buffers: true,
      parse: parseStreamResult,
      redis: redisConfig,
      // Reuse the cache's client as the control connection for CLIENT
      // UNBLOCK.  It's never blocked, so it can fulfil this role and
      // saves one Redis connection per cache instance.
      redisControl: this.client,
    })

    // Forward connection events from the listener's dedicated read
    // connection so errors are not silently swallowed.
    this.listener.on('error', (err: Error) => this.emit('error', err))

    this.listenerPromise = this.codecReady
      .then(() => this.listenForResults())
      .catch((err) => {
        if (!this.closed) this.emit('error', normalizeError(err))
      })
  }

  // ---- Typed event emitter overrides ----

  public override on<K extends keyof CacheEvents>(event: K, listener: CacheEvents[K]): this {
    return super.on(event, listener)
  }

  public override emit<K extends keyof CacheEvents>(
    event: K,
    ...args: Parameters<CacheEvents[K]>
  ): boolean {
    return super.emit(event, ...args)
  }

  // ---- Public API ----

  public async get(key: string, options?: { signal?: AbortSignal }): Promise<T> {
    await this.codecReady
    const signal = options?.signal
    if (signal?.aborted) {
      throw signal.reason instanceof Error ? signal.reason : new Error('Aborted')
    }

    // 1. Local cache
    const local = this.localCache.get(key)
    if (local && local.expiresAt > Date.now()) {
      // Touch for LRU: delete + re-insert moves the entry to the end
      if (this.maxSize) {
        this.localCache.delete(key)
        this.localCache.set(key, local)
      }
      this.emit('hit', key, 'local')
      return local.value
    }
    this.localCache.delete(key)

    // 2. Coalesce with existing pending request
    const existing = this.pending.get(key)
    if (existing && !existing.resolved) {
      return this.addWaiter(existing, signal)
    }

    // 3. Start fetch flow
    return this.startFetchFlow(key, signal)
  }

  public async set(key: string, value: T): Promise<void> {
    await this.codecReady
    const encoded = this.codec.encode(value)
    this.setLocal(key, value)

    const pipeline = this.client.pipeline()
    pipeline.set(`${this.keyPrefix}${key}`, encoded, 'PX', this.redisTtl)
    pipeline.xadd(
      this.resultStream,
      'MAXLEN',
      '~',
      this.resultMaxLen,
      '*',
      'k',
      key,
      'v',
      encoded,
      't',
      'value',
    )
    const results = await pipeline.exec()
    if (results) {
      for (const [err] of results) {
        if (err) throw err
      }
    }

    this.resolveEntry(key, value)
  }

  /**
   * Return the local cache value for `key` without triggering a fetch,
   * emitting events, or updating LRU order.  Returns `undefined` when
   * the key is absent or expired.
   */
  public peek(key: string): T | undefined {
    const local = this.localCache.get(key)
    if (local && local.expiresAt > Date.now()) {
      return local.value
    }
    return undefined
  }

  /**
   * Clear the in-memory local cache.  Does not affect Redis or broadcast
   * to other instances.  Useful for memory pressure or testing.
   */
  public clear(): void {
    this.localCache.clear()
  }

  public async invalidate(key: string): Promise<void> {
    this.localCache.delete(key)
    await CACHE_INVALIDATE.exec(
      this.client,
      `${this.keyPrefix}${key}`,
      this.resultStream,
      this.resultMaxLen.toString(),
      key,
    )
  }

  public async close(): Promise<void> {
    if (this.closed) return
    this.closed = true

    // Signal in-flight fetchers to abort
    this.abortController.abort()

    // Reject all pending
    for (const [, entry] of this.pending) {
      if (!entry.resolved) {
        entry.resolved = true
        if (entry.timer) clearTimeout(entry.timer)
        const err = new Error('SingleFlightCache closed')
        for (const waiter of entry.waiters) {
          waiter.cleanup?.()
          waiter.reject(err)
        }
      }
    }
    this.pending.clear()
    this.localCache.clear()

    try {
      await this.listener.drain()
    } catch {
      // listener may already be closed
    }
    await this.listenerPromise

    if (this.createdClient) {
      await closeClient(this.client)
    }

    this.emit('closed')
  }

  // ---- Internal: fetch flow ----

  /**
   * Register a waiter promise on an existing pending entry, optionally
   * wired to an AbortSignal so the caller can cancel without affecting
   * other waiters or the underlying fetch.
   */
  private addWaiter(entry: PendingEntry<T>, signal?: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const waiter: Waiter<T> = { resolve, reject }
      entry.waiters.push(waiter)

      if (signal) {
        const onAbort = () => {
          if (entry.resolved) return
          const idx = entry.waiters.indexOf(waiter)
          if (idx >= 0) entry.waiters.splice(idx, 1)
          reject(signal.reason instanceof Error ? signal.reason : new Error('Aborted'))
        }
        signal.addEventListener('abort', onAbort, { once: true })
        waiter.cleanup = () => signal.removeEventListener('abort', onAbort)
      }
    })
  }

  private startFetchFlow(key: string, signal?: AbortSignal): Promise<T> {
    const entry: PendingEntry<T> = {
      waiters: [],
      timer: null,
      resolved: false,
      fetchedLocally: false,
    }
    this.pending.set(key, entry)

    this.doFetchFlow(key, entry).catch((err) => {
      this.rejectEntry(key, normalizeError(err))
    })

    return this.addWaiter(entry, signal)
  }

  private async doFetchFlow(key: string, entry: PendingEntry<T>): Promise<void> {
    const token = randomUUID()
    const result = (await CACHE_GET.exec(
      this.client,
      `${this.keyPrefix}${key}`,
      `${this.keyPrefix}lock:${key}`,
      token,
      this.lockTtl.toString(),
    )) as (number | Buffer | null)[]

    const status = result[0] as number

    if (status === 1 && result[1]) {
      // Redis cache hit
      const value = this.codec.decode<T>(result[1] as Buffer)
      this.setLocal(key, value)
      this.emit('hit', key, 'redis')
      this.resolveEntry(key, value)
      return
    }

    // Set timeout for waiters (both lock winner and loser)
    entry.timer = setTimeout(() => this.handleTimeout(key), this.timeout)

    if (status === 2) {
      // Lock acquired -- we fetch
      entry.fetchedLocally = true
      this.emit('miss', key)
      this.doFetch(key, token).catch((err) => {
        this.rejectEntry(key, normalizeError(err))
      })
    }
    // status === 3: lock held by another pod, wait for stream result
  }

  private async doFetch(key: string, token: string): Promise<void> {
    let extendTimer: ReturnType<typeof setInterval> | null = null

    try {
      if (this.extendLock) {
        const lockKey = `${this.keyPrefix}lock:${key}`
        extendTimer = setInterval(() => {
          CACHE_EXTEND_LOCK.exec(this.client, lockKey, token, this.lockTtl.toString()).catch(
            () => {},
          )
        }, this.lockTtl / 2)
        if (extendTimer.unref) extendTimer.unref()
      }

      const value = await this.fetcher(key, { signal: this.abortController.signal })
      this.emit('refresh', key)

      const encoded = this.codec.encode(value)

      const ok = await CACHE_SET.exec(
        this.client,
        `${this.keyPrefix}${key}`,
        this.resultStream,
        `${this.keyPrefix}lock:${key}`,
        encoded,
        this.redisTtl.toString(),
        this.resultMaxLen.toString(),
        key,
        token,
      )

      if (ok === 0) {
        this.emit('stale', key)
      }

      // Always resolve local waiters -- the value is valid even if the
      // lock was re-acquired (ok === 0 means the SET was skipped, but
      // the fetched value is still current for this moment).
      this.setLocal(key, value)
      this.resolveEntry(key, value)
    } finally {
      if (extendTimer) clearInterval(extendTimer)
    }
  }

  // ---- Internal: timeout fallback ----

  private async handleTimeout(key: string): Promise<void> {
    const entry = this.pending.get(key)
    if (!entry || entry.resolved) return

    try {
      // Value may have been written to Redis but stream delivery delayed
      const cached = await this.client.getBuffer(`${this.keyPrefix}${key}`)
      if (cached) {
        const value = this.codec.decode<T>(cached)
        this.setLocal(key, value)
        this.emit('hit', key, 'redis')
        this.resolveEntry(key, value)
        return
      }

      // Try to become the fetcher ourselves
      const token = randomUUID()
      const result = (await CACHE_GET.exec(
        this.client,
        `${this.keyPrefix}${key}`,
        `${this.keyPrefix}lock:${key}`,
        token,
        this.lockTtl.toString(),
      )) as (number | Buffer | null)[]

      const status = result[0] as number

      if (status === 1 && result[1]) {
        const value = this.codec.decode<T>(result[1] as Buffer)
        this.setLocal(key, value)
        this.emit('hit', key, 'redis')
        this.resolveEntry(key, value)
        return
      }

      if (status === 2) {
        // Lock acquired on retry -- fetch with a deadline so a hung
        // fetcher doesn't stall waiters indefinitely.
        entry.fetchedLocally = true
        const fetchPromise = this.doFetch(key, token)
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`SingleFlightCache: fetch timeout for "${key}"`)),
            this.timeout,
          ),
        )
        await Promise.race([fetchPromise, timeoutPromise])
        return
      }

      // Lock still held, no cached value -- give up
      this.rejectEntry(key, new Error(`SingleFlightCache: timeout waiting for "${key}"`))
    } catch (err) {
      this.rejectEntry(key, normalizeError(err))
    }
  }

  // ---- Internal: stream listener ----

  private async listenForResults(): Promise<void> {
    for await (const [, [, result]] of this.listener) {
      if (this.closed) break
      try {
        this.handleStreamResult(result)
      } catch (err) {
        this.emit('error', normalizeError(err))
      }
    }
  }

  private handleStreamResult(result: StreamResult): void {
    if (!result.key) return

    if (result.type === 'tombstone') {
      this.localCache.delete(result.key)
      return
    }

    // When this instance is the fetcher (fetchedLocally), doFetch
    // handles resolution directly.  The stream message still updates
    // the local cache but must not resolve the pending entry — it may
    // belong to a subsequent get() for the same key.
    const pending = this.pending.get(result.key)
    const skipResolve = pending?.fetchedLocally === true

    if (result.type === 'value' && result.value) {
      const value = this.codec.decode<T>(result.value)
      this.setLocal(result.key, value)
      if (!skipResolve) {
        this.emit('hit', result.key, 'stream')
        this.resolveEntry(result.key, value)
      }
    }
  }

  // ---- Internal: resolve / reject helpers ----

  private resolveEntry(key: string, value: T): void {
    const entry = this.pending.get(key)
    if (!entry || entry.resolved) return
    entry.resolved = true
    if (entry.timer) clearTimeout(entry.timer)
    this.pending.delete(key)
    for (const waiter of entry.waiters) {
      waiter.cleanup?.()
      waiter.resolve(value)
    }
  }

  private rejectEntry(key: string, error: Error): void {
    const entry = this.pending.get(key)
    if (!entry || entry.resolved) return
    entry.resolved = true
    if (entry.timer) clearTimeout(entry.timer)
    this.pending.delete(key)
    for (const waiter of entry.waiters) {
      waiter.cleanup?.()
      waiter.reject(error)
    }
  }

  private setLocal(key: string, value: T): void {
    // Delete first so re-insertion moves the key to the end (LRU order)
    if (this.maxSize) this.localCache.delete(key)
    this.localCache.set(key, { value, expiresAt: Date.now() + this.localTtl })
    // Evict oldest entry if over capacity
    if (this.maxSize && this.localCache.size > this.maxSize) {
      const oldest = this.localCache.keys().next().value
      if (oldest !== undefined) this.localCache.delete(oldest)
    }
  }

  // ---- Internal: redis config ----

  private static resolveRedisConfig(
    redis?: RedisClient | string | RedisOptions,
  ): string | RedisOptions | undefined {
    if (!redis) return undefined
    if (typeof redis === 'string') return redis
    if (typeof redis === 'object' && 'pipeline' in redis) {
      // Client instance -- extract options for creating separate connections
      return { ...(redis as RedisClient).options }
    }
    return { ...(redis as RedisOptions) }
  }
}
