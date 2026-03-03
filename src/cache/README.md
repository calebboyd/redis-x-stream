# redis-x-stream/cache

A distributed single-flight cache using  Redis. An L1 and L2 cache with Redis Streams for cross-instance broadcast.
Given an invalidation all instances wait for a single resolution. Preventing extraneous orgin load.

```bash
npm install redis-x-stream ioredis
```

```typescript
import { SingleFlightCache } from 'redis-x-stream/cache'
```

## Quick Start

```typescript
const cache = new SingleFlightCache<User>({
  fetcher: async (key, { signal }) => {
    const res = await fetch(`https://api.example.com/users/${key}`, { signal })
    return res.json()
  },
  redis: 'redis://localhost:6379',
})

const user = await cache.get('user:123')
```

Multiple concurrent calls to `get('user:123')` -- even across different
processes -- result in a single fetch. All callers receive the same value.

## How It Works

### Two-Tier Cache

| Tier | Storage | TTL | Purpose |
|------|---------|-----|---------|
| **L1** | In-process `Map` | 60s | Zero-network-hop reads, per-instance |
| **L2** | Redis `GET`/`SET` with `PX` | 5 min | Shared across all instances |

### Single-Flight Protocol

When `get(key)` is called:

1. **L1 check** -- if the local Map has a non-expired entry, return it immediately.
2. **In-process coalescing** -- if another `get()` for the same key is already
   in flight within this process, add a waiter to the existing `PendingEntry`.
3. **CACHE_GET Lua** -- atomically check Redis and conditionally acquire a
   distributed lock:
   - `status 1` -- L2 cache hit: decode and return.
   - `status 2` -- lock acquired: this instance calls the `fetcher`.
   - `status 3` -- lock held by another instance: wait for the result via
     the Redis Stream broadcast.
4. **Fetch** -- the lock winner calls `fetcher(key, { signal })`, then
   executes `CACHE_SET` Lua to atomically store the value, broadcast it
   on the stream, and release the lock.
5. **Broadcast** -- all instances listening on the stream receive the value
   and populate their L1 caches.

### Timeout Recovery

If no result arrives within `timeout` ms (default 5s), the waiter:
1. Retries a Redis GET (the value may exist but stream delivery was delayed).
2. Attempts to acquire the lock itself.
3. If the lock is won, fetches with a deadline.
4. If the lock is still held and no value is available, rejects with a timeout error.

## API

### `new SingleFlightCache<T>(options)`

Creates a cache instance. Starts a background Redis Stream listener immediately.

### `get(key, options?)`

```typescript
async get(key: string, options?: { signal?: AbortSignal }): Promise<T>
```

Returns the cached value or fetches it. The optional `AbortSignal` cancels
only the calling waiter -- it does not abort the underlying fetch or affect
other waiters for the same key.

### `set(key, value)`

```typescript
async set(key: string, value: T): Promise<void>
```

Manually write a value to both L1 and L2, and broadcast it to all instances
via the stream.

### `peek(key)`

```typescript
peek(key: string): T | undefined
```

Read from the local L1 cache without triggering a fetch, emitting events,
or updating LRU order. Returns `undefined` if absent or expired.

### `invalidate(key)`

```typescript
async invalidate(key: string): Promise<void>
```

Delete the key from L1, delete from Redis, and broadcast a tombstone message.
All other instances delete the key from their L1 caches when they receive
the tombstone.

### `clear()`

```typescript
clear(): void
```

Clear the entire local L1 cache. Does not affect Redis or broadcast to
other instances. Useful for memory pressure or testing.

### `close()`

```typescript
async close(): Promise<void>
```

Abort in-flight fetchers via `AbortController`, reject all pending waiters,
clear caches, drain the stream listener, and close Redis connections.
Emits `closed`.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fetcher` | `(key, { signal }) => Promise<T>` | **required** | Called on cache miss to produce the value |
| `redis` | `RedisClient \| string \| RedisOptions` | `new Redis()` | Redis connection |
| `localTtl` | `number` | `60_000` (1 min) | L1 in-process cache TTL (ms) |
| `redisTtl` | `number` | `300_000` (5 min) | L2 Redis cache TTL (ms) |
| `lockTtl` | `number` | `30_000` (30s) | Distributed fetch lock TTL (ms) |
| `timeout` | `number` | `5_000` (5s) | How long waiters wait before retrying (ms) |
| `resultStream` | `string` | `'cache:results'` | Redis Stream key for broadcasting |
| `resultMaxLen` | `number` | `10_000` | Approximate max stream length (MAXLEN ~) |
| `extendLock` | `boolean` | `false` | Periodically extend lock TTL for long-running fetches |
| `codec` | `'json' \| 'msgpack' \| Codec` | `'json'` | Serialization codec |
| `keyPrefix` | `string` | `'sfc:'` | Prefix for all Redis keys (data + lock) |
| `maxSize` | `number` | unbounded | Max entries in L1 cache (LRU eviction when exceeded) |

## Events

```typescript
cache.on('hit', (key, source) => {})    // source: 'local' | 'redis' | 'stream'
cache.on('miss', (key) => {})           // fetcher will be called
cache.on('refresh', (key) => {})        // fetcher completed successfully
cache.on('stale', (key) => {})          // fetcher completed but lock was re-acquired
cache.on('error', (error) => {})        // Redis/fetch/stream errors
cache.on('ready', () => {})             // Redis connection ready
cache.on('closed', () => {})            // Cache fully shut down
```

## Invalidation

Three mechanisms keep the cache consistent:

### Explicit Invalidation

```typescript
await cache.invalidate('user:123')
```

Runs a Lua script that atomically deletes the Redis key and broadcasts a
tombstone on the stream. All instances delete the key from their L1 caches.

### TTL Expiry

- **L1**: entries have an `expiresAt` timestamp checked on every `get()`.
  Expired entries are ignored and deleted.
- **L2**: values are stored with `PX` (millisecond expiry). Redis evicts
  them automatically.

### LRU Eviction (L1 only)

When `maxSize` is set, the local Map uses insertion order as LRU order.
On a cache hit, the entry is deleted and re-inserted to move it to the end.
When size exceeds `maxSize`, the oldest entry is evicted.

```typescript
const cache = new SingleFlightCache({
  fetcher,
  maxSize: 1000, // keep at most 1000 entries in L1
})
```

## Lock Extension

For long-running fetchers, enable `extendLock` to prevent the lock from
expiring while the fetch is still in progress:

```typescript
const cache = new SingleFlightCache({
  fetcher: async (key) => {
    // slow operation...
  },
  lockTtl: 30_000,
  extendLock: true, // extends lock every lockTtl/2 (15s)
})
```

The extension uses a Lua script that only extends the TTL if the lock
token still matches, preventing stale extensions.

## Stale Detection

If the lock expires and another instance acquires it before the original
fetcher completes, the `CACHE_SET` Lua script detects the token mismatch
and returns 0. The cache emits a `stale` event. The fetched value is still
returned to local waiters but is not written to Redis (the new lock
holder's value takes precedence).

## AbortSignal Support

The `fetcher` receives an `AbortSignal` from the cache's internal
`AbortController`. It is aborted when `close()` is called. Forward it
to `fetch()`, database drivers, or any cancellable operation:

```typescript
const cache = new SingleFlightCache({
  async fetcher(key, { signal }) {
    const res = await fetch(`/api/${key}`, { signal })
    return res.json()
  },
})
```

Individual `get()` calls also accept an `AbortSignal` that cancels only
that waiter without affecting the underlying fetch:

```typescript
const controller = new AbortController()
setTimeout(() => controller.abort(), 1000)

try {
  const value = await cache.get('key', { signal: controller.signal })
} catch (err) {
  // AbortError -- other waiters for the same key are unaffected
}
```

## Atomic Lua Scripts

All critical operations are implemented as Lua scripts executed atomically
in Redis. The `LuaScript` class uses EVALSHA with an automatic EVAL fallback
on NOSCRIPT errors.

| Script | Keys | Purpose |
|--------|------|---------|
| `CACHE_GET` | cache key, lock key | Check L2 hit or acquire lock (SET NX PX) |
| `CACHE_SET` | cache key, stream, lock key | Verify token, store value, broadcast, release lock |
| `CACHE_INVALIDATE` | cache key, stream | Delete value, broadcast tombstone |
| `CACHE_EXTEND_LOCK` | lock key | Extend lock TTL if token matches |

## Multiple Cache Instances

Use `keyPrefix` and `resultStream` to run multiple independent caches on
the same Redis instance:

```typescript
const userCache = new SingleFlightCache({
  fetcher: fetchUser,
  keyPrefix: 'users:',
  resultStream: 'users:results',
})

const productCache = new SingleFlightCache({
  fetcher: fetchProduct,
  keyPrefix: 'products:',
  resultStream: 'products:results',
})
```

## Codec

Payloads are serialized with a pluggable codec. The default is JSON.
MessagePack is also supported via the optional `msgpackr` package for
compact binary encoding, or provide a custom implementation:

```typescript
// MessagePack codec (requires: npm install msgpackr)
const cache = new SingleFlightCache({
  fetcher,
  codec: 'msgpack',
})
```
