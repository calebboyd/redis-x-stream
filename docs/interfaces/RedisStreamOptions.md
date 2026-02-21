[**redis-x-stream**](../README.md)

***

[redis-x-stream](../globals.md) / RedisStreamOptions

# Interface: RedisStreamOptions\<T\>

Defined in: [src/types.ts:79](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/types.ts#L79)

## Type Parameters

### T

`T` = `StreamEntryKeyValues`

## Properties

### ackOnIterate?

> `optional` **ackOnIterate**: `boolean`

Defined in: [src/types.ts:132](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/types.ts#L132)

If set to `true` Iterables utilizing consumer groups will
automatically queue acknowledgments for previously iterated entries.

#### Default

```ts
false
```

***

### block?

> `optional` **block**: `number`

Defined in: [src/types.ts:126](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/types.ts#L126)

The longest amount of time in milliseconds the dispenser should block
while waiting for new entries on any stream, passed to xread or xreadgroup

***

### buffers?

> `optional` **buffers**: `boolean`

Defined in: [src/types.ts:115](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/types.ts#L115)

Return buffers with each xread operation
This applies to entry id and kv results

***

### claimIdleTime?

> `optional` **claimIdleTime**: `number`

Defined in: [src/types.ts:161](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/types.ts#L161)

Minimum idle time in milliseconds for pending entries to be claimed
from other consumers via XAUTOCLAIM.  Requires Redis >= 6.2.
Enables dead consumer recovery — entries abandoned by crashed consumers
are automatically claimed and re-delivered through the iterator.

Disabled by default (no claiming).

***

### consumer?

> `optional` **consumer**: `string`

Defined in: [src/types.ts:99](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/types.ts#L99)

The consumer.
Note: if only consumer is provided, a group is created automatically

***

### count?

> `optional` **count**: `number`

Defined in: [src/types.ts:121](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/types.ts#L121)

The maximum number of entries to retrieve in a single read operation
eg. the "highWaterMark"

#### Default

```ts
100
```

***

### deleteOnAck?

> `optional` **deleteOnAck**: `boolean`

Defined in: [src/types.ts:138](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/types.ts#L138)

If set to `true` Iterables utilizing consumer groups will
automatically delete entries after acknowledgment

#### Default

```ts
false
```

***

### flushPendingAckInterval?

> `optional` **flushPendingAckInterval**: `number` \| `null`

Defined in: [src/types.ts:152](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/types.ts#L152)

Maximum time in milliseconds between an ack being queued and it being
flushed to Redis.  The timer resets after each call to `ack()`.
Useful when the consumer is slow or the reader is blocked — acks are
flushed even if the next `readAckDelete` pipeline hasn't run yet.

Set to `null` (default) to disable the timer.

***

### group?

> `optional` **group**: `string`

Defined in: [src/types.ts:94](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/types.ts#L94)

The consumer group.
Note: if only a group is provided a consumer is created automatically

***

### noack?

> `optional` **noack**: `boolean`

Defined in: [src/types.ts:143](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/types.ts#L143)

Pass the NOACK flag to calls to xreadgroup bypassing the Redis PEL

#### Default

```ts
false
```

***

### parse?

> `optional` **parse**: [`ParseFn`](../type-aliases/ParseFn.md)\<`T`\>

Defined in: [src/types.ts:170](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/types.ts#L170)

Transform each entry's raw key-value array before yielding.
Receives the entry ID, the flat `[k1, v1, k2, v2, ...]` array,
and the stream name.  The return value becomes the entry payload
in the iterator output: `[streamName, [entryId, T]]`.

When omitted the raw `string[]` is yielded unchanged.

***

### redis?

> `optional` **redis**: `string` \| `Redis` \| [`RedisOptions`](../type-aliases/RedisOptions.md)

Defined in: [src/types.ts:104](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/types.ts#L104)

The IORedis client connection (reader).
NOTE: by default this connection becomes a "reader" when block > 0

***

### redisControl?

> `optional` **redisControl**: `string` \| `Redis` \| [`RedisOptions`](../type-aliases/RedisOptions.md)

Defined in: [src/types.ts:110](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/types.ts#L110)

The IORedis control client connection (writer).
NOTE: by default this connection becomes a "writer" when block = 0 or Infinity
Only allowed if block = 0 or Infinity

***

### stream?

> `optional` **stream**: `string` \| `Record`\<`string`, `string`\> \| `string`[]

Defined in: [src/types.ts:89](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/types.ts#L89)

Redis stream keys to be read. If a Record is provided each value is the starting id for that stream

***

### streams?

> `optional` **streams**: `string` \| `Record`\<`string`, `string`\> \| `string`[]

Defined in: [src/types.ts:85](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/types.ts#L85)

Redis stream keys to be read. If a Record is provided each value is the starting id for that stream

 *alias* for stream
