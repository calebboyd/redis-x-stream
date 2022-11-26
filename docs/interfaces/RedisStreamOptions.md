[redis-x-stream](../README.md) / [Exports](../modules.md) / RedisStreamOptions

# Interface: RedisStreamOptions

## Table of contents

### Properties

- [ackOnIterate](RedisStreamOptions.md#ackoniterate)
- [block](RedisStreamOptions.md#block)
- [buffers](RedisStreamOptions.md#buffers)
- [consumer](RedisStreamOptions.md#consumer)
- [count](RedisStreamOptions.md#count)
- [deleteOnAck](RedisStreamOptions.md#deleteonack)
- [flushPendingAckInterval](RedisStreamOptions.md#flushpendingackinterval)
- [group](RedisStreamOptions.md#group)
- [noack](RedisStreamOptions.md#noack)
- [redis](RedisStreamOptions.md#redis)
- [redisControl](RedisStreamOptions.md#rediscontrol)
- [streams](RedisStreamOptions.md#streams)

## Properties

### ackOnIterate

• `Optional` **ackOnIterate**: `boolean`

If set to `true` Iterables utilizing consumer groups will
automatically queue acknowledgments for previously iterated entries.

**`Default`**

false

#### Defined in

[types.ts:76](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/types.ts#L76)

___

### block

• `Optional` **block**: `number`

The longest amount of time in milliseconds the dispenser should block
while waiting for new entries on any stream, passed to xread or xreadgroup

#### Defined in

[types.ts:70](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/types.ts#L70)

___

### buffers

• `Optional` **buffers**: `boolean`

Return buffers with each xread operation
This applies to entry id and kv results

#### Defined in

[types.ts:59](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/types.ts#L59)

___

### consumer

• `Optional` **consumer**: `string`

The consumer.
Note: if only consumer is provided, a group is created automatically

#### Defined in

[types.ts:43](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/types.ts#L43)

___

### count

• `Optional` **count**: `number`

The maximum number of entries to retrieve in a single read operation
eg. the "highWaterMark"

**`Default`**

100

#### Defined in

[types.ts:65](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/types.ts#L65)

___

### deleteOnAck

• `Optional` **deleteOnAck**: `boolean`

If set to `true` Iterables utilizing consumer groups will
automatically delete entries after acknowledgment

**`Default`**

false

#### Defined in

[types.ts:82](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/types.ts#L82)

___

### flushPendingAckInterval

• `Optional` **flushPendingAckInterval**: `number`

If iteration is slow, set this to the maximum amount of time that should elapse before pending acks will be flushed
This counter is reset after each iteration or ack

TODO: not yet implemented

#### Defined in

[types.ts:94](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/types.ts#L94)

___

### group

• `Optional` **group**: `string`

The consumer group.
Note: if only a group is provided a consumer is created automatically

#### Defined in

[types.ts:38](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/types.ts#L38)

___

### noack

• `Optional` **noack**: `boolean`

Pass the NOACK flag to calls to xreadgroup bypassing the Redis PEL

**`Default`**

false

#### Defined in

[types.ts:87](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/types.ts#L87)

___

### redis

• `Optional` **redis**: `string` \| `Redis` \| `RedisOptions`

The IORedis client connection (reader).
NOTE: by default this connection becomes a "reader" when block > 0

#### Defined in

[types.ts:48](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/types.ts#L48)

___

### redisControl

• `Optional` **redisControl**: `string` \| `Redis` \| `RedisOptions`

The IORedis control client connection (writer).
NOTE: by default this connection becomes a "writer" when block = 0 or Infinity
Only allowed if block = 0 or Infinity

#### Defined in

[types.ts:54](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/types.ts#L54)

___

### streams

• **streams**: `Record`<`string`, `string`\> \| `string`[]

Redis stream keys to be read. If a Record is provided each value is the starting id for that stream

#### Defined in

[types.ts:33](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/types.ts#L33)
