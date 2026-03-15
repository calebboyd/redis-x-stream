# redis-x-stream/queue

A job queue and worker system built on Redis Streams. Provides reliable, at-least-once
job processing with concurrency control, automatic retries with backoff, dead-letter
queues, output streams, and job forwarding.

```bash
npm install redis-x-stream ioredis
```

```typescript
import { Queue, Worker } from 'redis-x-stream/queue'
```

## Queue (Producer)

`Queue` adds jobs to a Redis stream. Each job is a stream entry with codec-encoded
data and metadata fields.

```typescript
const queue = new Queue<{ url: string }>('crawl-tasks', {
  redis: 'redis://localhost:6379',
})

// Single job
const id = await queue.add({ url: 'https://example.com' })

// Bulk insert (pipelined)
const ids = await queue.addBulk([
  { url: 'https://a.com' },
  { url: 'https://b.com' },
])

await queue.close()
```

### Queue Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `redis` | `RedisClient \| string \| RedisOptions` | `new Redis()` | Redis connection. Falls back to `REDIS_X_STREAM_URL` env var. |
| `codec` | `'json' \| 'msgpack' \| Codec` | `'json'` | Serialization format for job payloads |

## Worker (Consumer)

`Worker` consumes jobs from a Redis stream using a consumer group, processes them
through a handler function, and manages acknowledgment, retries, and failure routing.

```typescript
const worker = new Worker<{ url: string }>('crawl-tasks', {
  group: 'crawlers',
  concurrency: 10,
  retries: 3,
  backoff: { strategy: 'exponential', delay: 1000 },
  dlq: 'crawl-tasks:dead',

  async handler(job, ctx) {
    const html = await fetch(job.data.url, { signal: ctx.signal })
    return { status: html.status }
  },
})

worker.on('completed', (job, result) => {
  console.log(`${job.id} done`, result)
})

worker.on('failed', (job, error) => {
  console.error(`${job.originId} failed after ${job.attempt + 1} attempts:`, error.message)
})

worker.on('retrying', (job, error, attempt) => {
  console.log(`${job.originId} retry ${attempt}:`, error.message)
})

// Graceful shutdown
await worker.close()
```

### Worker Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `handler` | `(job, ctx) => Promise<unknown>` | **required** | Async function called for each job |
| `group` | `string` | **required** | Consumer group name |
| `consumer` | `string` | auto-generated | Consumer name within the group |
| `concurrency` | `number` | `1` | Max jobs processed in parallel |
| `retries` | `number` | `0` | Max retry attempts per job |
| `backoff` | `BackoffOptions` | none | Retry delay configuration |
| `dlq` | `string` | none | Dead-letter queue stream key |
| `output` | `string` | none | Stream key for handler return values |
| `codec` | `'json' \| 'msgpack' \| Codec` | `'json'` | Serialization format |
| `redis` | `RedisClient \| string \| RedisOptions` | `new Redis()` | Redis connection |
| `block` | `number` | `Infinity` | Block timeout for reads (ms) |
| `count` | `number` | `concurrency` | Entries fetched per read batch |
| `claimIdleTime` | `number` | none | Min idle ms for XAUTOCLAIM (Redis 6.2+) |
| `deleteOnAck` | `boolean` | `false` | XDEL entries after acknowledgment |
| `flushPendingAckInterval` | `number \| null` | `null` | Watchdog timer (ms) for flushing queued acks |

## Handler and Context

The handler receives a `Job<T>` and a `Context`:

```typescript
interface Job<T> {
  readonly id: string       // Stream entry ID of this attempt
  readonly originId: string // Original entry ID (stable across retries)
  readonly stream: string   // Stream key
  readonly data: T          // Decoded payload
  readonly attempt: number  // 0-indexed attempt number
  readonly createdAt: number // Timestamp (ms) when first created
}

interface Context {
  readonly signal: AbortSignal            // Aborted on worker.close()
  forward(stream: string, data: unknown): void // Route data to another stream
}
```

### Forwarding

`ctx.forward()` queues data to be written to another stream in the same pipeline
as the ack. This is useful for fan-out or multi-stage processing:

```typescript
async handler(job, ctx) {
  const result = await process(job.data)
  ctx.forward('notifications', { userId: job.data.userId, status: 'done' })
  ctx.forward('analytics', { duration: result.ms })
  return result
}
```

Forwarded entries are written in the same pipeline as the ack. If a forward
fails (e.g. wrong key type), the error is emitted but the ack still succeeds.

### Output Stream

If `output` is set and the handler returns a non-`undefined` value, the return
value is automatically written to the output stream:

```typescript
const worker = new Worker('raw-events', {
  group: 'enrichers',
  output: 'enriched-events',
  async handler(job) {
    return { ...job.data, enriched: true } // written to 'enriched-events'
  },
})
```

## Retries and Backoff

When a handler throws and `job.attempt < retries`, the job is re-enqueued
to the same stream with an incremented attempt counter and the original
`originId` preserved.

```typescript
const worker = new Worker('tasks', {
  group: 'workers',
  retries: 5,
  backoff: {
    strategy: 'exponential', // 'fixed' | 'exponential'
    delay: 1000,             // base delay in ms
    maxDelay: 30_000,        // cap for exponential (default: 30s)
  },
  handler,
})
```

**Backoff strategies:**
- `fixed` -- always waits `delay` ms between retries
- `exponential` -- waits `min(delay * 2^attempt, maxDelay)` ms

If the worker shuts down during a backoff sleep, the re-enqueue still
happens. The original entry is acked before scheduling the retry, so
the job is never lost or double-processed.

## Dead-Letter Queue

When a job exhausts all retries (or fails with `retries: 0`), it can be
routed to a dead-letter queue for inspection or manual replay:

```typescript
const worker = new Worker('tasks', {
  group: 'workers',
  retries: 3,
  dlq: 'tasks:dead',
  handler,
})
```

DLQ entries contain full context:

```typescript
interface DLQEntry<T> {
  data: T | string[]       // Job data (or raw strings on parse error)
  parseError?: true        // Present when entry couldn't be decoded
  error: string            // Error message
  originalId: string       // Original stream entry ID
  originalStream: string   // Source stream
  attempt: number          // Which attempt failed
  failedAt: number         // Timestamp (ms)
  createdAt: number        // Original creation timestamp
}
```

Entries that fail to decode (missing fields, corrupt data) are also routed
to the DLQ with `parseError: true` and the raw data preserved as strings.

## Concurrency

The worker uses a semaphore to limit the number of concurrent handler
invocations. The `count` option controls how many entries are fetched per
XREADGROUP call (defaults to `concurrency`).

```typescript
const worker = new Worker('tasks', {
  group: 'workers',
  concurrency: 20,
  count: 20, // fetch up to 20 entries per read
  handler,
})
```

## Pause and Resume

Pause consumption for backpressure or maintenance:

```typescript
worker.pause()   // blocks the pump loop
worker.resume()  // unblocks
```

In-flight jobs continue processing while paused. Only new reads are blocked.

## Dead Consumer Recovery

Combine `claimIdleTime` with the worker to automatically pick up jobs
abandoned by crashed consumers:

```typescript
const worker = new Worker('tasks', {
  group: 'workers',
  claimIdleTime: 60_000, // claim entries idle > 60s
  handler,
})
```

Uses `XAUTOCLAIM` (Redis 6.2+) under the hood.

## Lifecycle

```typescript
const worker = new Worker('tasks', { group: 'workers', handler })

// Graceful shutdown (waits for in-flight + retries, then closes)
await worker.close()

// With timeout (force-close after 10s)
await worker.close(10_000)
```

`close()` drains the underlying `RedisStream`, waits for all in-flight
and retry tasks to settle, then shuts down connections and emits `closed`.

## Events

| Event | Callback | Description |
|-------|----------|-------------|
| `completed` | `(job, result) => void` | Handler succeeded |
| `failed` | `(job, error) => void` | Job exhausted all retries |
| `retrying` | `(job, error, attempt) => void` | Job failed, will retry at `attempt` |
| `error` | `(error) => void` | System errors, parse errors |
| `ready` | `() => void` | Redis connection ready |
| `closed` | `() => void` | Worker fully shut down |

## Codec

Payloads are serialized with a pluggable codec. The default is JSON.
MessagePack is also supported via the optional `msgpackr` package for
compact binary encoding.

```typescript
// MessagePack codec (requires: npm install msgpackr)
const queue = new Queue('tasks', { codec: 'msgpack' })
const worker = new Worker('tasks', { group: 'g', codec: 'msgpack', handler })

// Custom codec
const codec = {
  encode(value: unknown): Buffer { /* ... */ },
  decode<T>(data: Buffer): T { /* ... */ },
}
```

The queue and worker **must use the same codec** for a given stream.
