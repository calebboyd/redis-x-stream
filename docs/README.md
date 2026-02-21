**redis-x-stream**

***

# redis-x-stream

Async iterables over Redis streams. Requires Redis 5+ (6.2+ for `claimIdleTime`).

[![release](https://badgen.net/github/release/calebboyd/redis-x-stream)](https://www.npmjs.com/package/redis-x-stream)
[![license](https://badgen.net/badge/license/MIT/blue)](https://github.com/calebboyd/redis-x-stream/blob/main/LICENSE)
[![test](https://github.com/calebboyd/redis-x-stream/actions/workflows/test.yml/badge.svg)](https://github.com/calebboyd/redis-x-stream/actions)

## Install

```bash
npm install redis-x-stream ioredis
```

## Basic Usage

```typescript
import { RedisStream } from 'redis-x-stream'

for await (const [stream, [id, keyvals]] of new RedisStream('my-stream')) {
  console.log(stream, id, keyvals) // 'my-stream', '1234-0', ['key', 'value']
}
```

## Consumer Groups

```typescript
const stream = new RedisStream({
  streams: ['my-stream'],
  group: 'my-group',
  consumer: 'worker-1',
  block: Infinity,
  count: 10,
  ackOnIterate: true,
  deleteOnAck: true,
})

for await (const [name, [id, keyvals]] of stream) {
  await process(keyvals)
}
```

Groups and consumers are created automatically. On startup, pending entries (PEL) are
re-delivered before new entries.

## Typed Parsing

Pass a `parse` callback to transform the raw key-value array. The return type flows
through the generic to the iterator.

```typescript
interface Order {
  product: string
  qty: number
}

const stream = new RedisStream<Order>({
  stream: 'orders',
  group: 'workers',
  ackOnIterate: true,
  parse: (id, kv) => ({ product: kv[1], qty: Number(kv[3]) }),
})

for await (const [name, [id, order]] of stream) {
  order.product // string
  order.qty     // number
}
```

## Dead Consumer Recovery

`claimIdleTime` uses `XAUTOCLAIM` (Redis 6.2+) to automatically claim entries
from consumers that have been idle too long. Claimed entries are yielded alongside
new entries.

```typescript
const stream = new RedisStream({
  streams: ['tasks'],
  group: 'workers',
  consumer: 'worker-1',
  block: Infinity,
  claimIdleTime: 30_000, // claim entries idle > 30s
  ackOnIterate: true,
})
```

## Dynamic Streams

Add streams at runtime, even while blocked:

```typescript
const stream = new RedisStream({
  streams: ['stream-a'],
  block: Infinity,
})

// later, from another context:
stream.addStream('stream-b')
```

## Lifecycle

```typescript
// Graceful shutdown: finish PEL, flush acks, stop
await stream.drain()

// Immediate stop: flush acks, close connections
await stream.quit()

// break also cleans up (via try/finally)
for await (const entry of stream) {
  if (done) break // connections are closed automatically
}
```

## Flush Timer

When the consumer is slow or the reader is blocked, acks can pile up.
`flushPendingAckInterval` adds a watchdog timer that flushes pending acks
if no new acks are queued within the interval.

```typescript
const stream = new RedisStream({
  streams: ['tasks'],
  group: 'workers',
  ackOnIterate: true,
  flushPendingAckInterval: 5000, // flush every 5s of inactivity
})
```

## Observability

Query stream and consumer group state without dropping to raw ioredis:

```typescript
const info = await stream.info()         // XINFO STREAM (per stream)
const groups = await stream.groups()     // XINFO GROUPS
const consumers = await stream.consumers() // XINFO CONSUMERS
const pending = await stream.pending()   // XPENDING summary
```

All return typed objects (`StreamInfo`, `GroupInfo`, `ConsumerInfo`, `PendingSummary`).

## Events

Connection lifecycle events are forwarded from ioredis:

```typescript
stream.on('error', (err) => console.error(err))
stream.on('ready', () => console.log('connected'))
stream.on('close', () => console.log('disconnected'))
stream.on('reconnecting', () => console.log('reconnecting'))
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `streams` / `stream` | `string \| string[] \| Record<string, string>` | | Stream keys to read |
| `group` | `string` | | Consumer group name |
| `consumer` | `string` | auto | Consumer name |
| `redis` | `Redis \| string \| RedisOptions` | `new Redis()` | Reader connection |
| `redisControl` | `Redis \| string \| RedisOptions` | auto | Control connection (blocking mode) |
| `block` | `number` | | Block timeout in ms (`Infinity` for indefinite) |
| `count` | `number` | `100` | Max entries per read |
| `ackOnIterate` | `boolean` | `false` | Auto-ack previous entry on each iteration |
| `deleteOnAck` | `boolean` | `false` | XDEL after XACK |
| `noack` | `boolean` | `false` | Bypass PEL (NOACK flag) |
| `claimIdleTime` | `number` | | Min idle ms for XAUTOCLAIM (Redis 6.2+) |
| `flushPendingAckInterval` | `number \| null` | `null` | Ack flush watchdog timer in ms |
| `parse` | `(id, kv, stream) => T` | | Entry transform callback |
| `buffers` | `boolean` | `false` | Return Buffers instead of strings |

## License

MIT
