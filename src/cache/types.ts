import type { RedisClient, RedisOptions } from '../types.js'
import type { CodecOption } from '../queue/types.js'

export interface SingleFlightCacheOptions<T> {
  /**
   * Async function called to fetch the value on a cache miss.
   * Receives the cache key and an options object containing an
   * `AbortSignal` that is aborted when the cache is closed.
   * The signal can be forwarded to `fetch()`, database drivers, etc.
   * Existing fetchers that ignore the second argument continue to work.
   */
  fetcher: (key: string, options: { signal: AbortSignal }) => Promise<T>
  /**
   * Redis connection used for cache operations.
   * Accepts an existing ioredis client, a connection URL string,
   * or an ioredis `RedisOptions` object.
   * Falls back to `REDIS_X_STREAM_URL` or localhost.
   */
  redis?: RedisClient | string | RedisOptions
  /**
   * Time in **milliseconds** that values are kept in the in-process
   * local cache before being considered stale.
   * @default 60_000 (1 minute)
   */
  localTtl?: number
  /**
   * Time in **milliseconds** that values are kept in Redis.
   * @default 300_000 (5 minutes)
   */
  redisTtl?: number
  /**
   * Time in **milliseconds** that the distributed fetch lock is held.
   * Should be longer than the expected fetcher duration.
   * @default 30_000 (30 seconds)
   */
  lockTtl?: number
  /**
   * Redis stream key used to broadcast cache results between instances.
   * @default 'cache:results'
   */
  resultStream?: string
  /**
   * Approximate maximum length of the results stream (MAXLEN ~).
   * @default 10_000
   */
  resultMaxLen?: number
  /**
   * Time in **milliseconds** before a pending request times out and
   * retries.  Applies both to waiters blocked on another instance's
   * fetch and to the retry fetch itself.
   * @default 5_000 (5 seconds)
   */
  timeout?: number
  /**
   * When `true`, the fetch lock TTL is periodically extended while
   * the fetcher is running, preventing other instances from retrying
   * prematurely for long-running fetches.
   * @default false
   */
  extendLock?: boolean
  /**
   * Codec used to serialise / deserialise values stored in Redis.
   * Accepts `'json'` (default), `'msgpack'`, or a custom `Codec`.
   * The `'msgpack'` codec requires installing `msgpackr` separately.
   */
  codec?: CodecOption
  /**
   * Prefix prepended to all Redis keys managed by this cache
   * (data keys, lock keys).
   * @default 'sfc:'
   */
  keyPrefix?: string
  /**
   * Maximum number of entries in the local in-process cache.
   * When set, least-recently-used entries are evicted once the
   * limit is reached.  When unset the local cache is unbounded
   * (entries are only removed when their `localTtl` expires).
   */
  maxSize?: number
}

export interface CacheEvents {
  hit: (key: string, source: 'local' | 'redis' | 'stream') => void
  miss: (key: string) => void
  refresh: (key: string) => void
  stale: (key: string) => void
  error: (error: Error) => void
  ready: () => void
  closed: () => void
}

export interface StreamResult {
  key: string
  type: 'value' | 'tombstone'
  value?: Buffer
}
