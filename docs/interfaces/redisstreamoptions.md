[redis-x-stream](../README.md) / [Exports](../modules.md) / RedisStreamOptions

# Interface: RedisStreamOptions<T\>

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Mode`](../modules.md#mode) |

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
- [mode](RedisStreamOptions.md#mode)
- [noack](RedisStreamOptions.md#noack)
- [redis](RedisStreamOptions.md#redis)
- [streams](RedisStreamOptions.md#streams)

## Properties

### ackOnIterate

• `Optional` **ackOnIterate**: `boolean`

If set to `true` Iterables utilizing consumer groups will
automatically queue acknowledgments for previously iterated entries.

**`Default`**

false

#### Defined in

[types.ts:98](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/types.ts#L98)

___

### block

• `Optional` **block**: `number`

The longest amount of time in milliseconds the dispenser should block
while waiting for new entries on any stream, passed to xread or xreadgroup

#### Defined in

[types.ts:92](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/types.ts#L92)

___

### buffers

• `Optional` **buffers**: `boolean`

Return buffers with each xread operation
This applies to entry id and kv results

#### Defined in

[types.ts:81](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/types.ts#L81)

___

### consumer

• `Optional` **consumer**: `string`

The consumer.
Note: if only consumer is provided, a group is created automatically

#### Defined in

[types.ts:71](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/types.ts#L71)

___

### count

• `Optional` **count**: `number`

The maximum number of entries to retrieve in a single read operation
eg. the "highWaterMark"

**`Default`**

100

#### Defined in

[types.ts:87](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/types.ts#L87)

___

### deleteOnAck

• `Optional` **deleteOnAck**: `boolean`

If set to `true` Iterables utilizing consumer groups will
automatically delete entries after acknowledgment

**`Default`**

false

#### Defined in

[types.ts:104](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/types.ts#L104)

___

### flushPendingAckInterval

• `Optional` **flushPendingAckInterval**: `number`

If iteration is slow, set this to the maximum amount of time that should elapse before pending acks will be flushed
This counter is reset after each iteration or ack

TODO: not yet implemented

#### Defined in

[types.ts:116](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/types.ts#L116)

___

### group

• `Optional` **group**: `string`

The consumer group.
Note: if only a group is provided a consumer is created automatically

#### Defined in

[types.ts:66](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/types.ts#L66)

___

### mode

• `Optional` **mode**: `T`

`'entry'` mode is default and will iterate over each stream entry in each stream in the result set

`'stream'` mode will iterate over each XREAD[GROUP] stream result

`'batch'` mode will iterate over each XREAD[GROUP] call result

**`Default`**

`'entry'`

#### Defined in

[types.ts:57](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/types.ts#L57)

___

### noack

• `Optional` **noack**: `boolean`

Pass the NOACK flag to calls to xreadgroup bypassing the Redis PEL

**`Default`**

false

#### Defined in

[types.ts:109](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/types.ts#L109)

___

### redis

• `Optional` **redis**: `string` \| `Redis` \| `RedisOptions`

The IORedis client connection.
NOTE: by default this connection becomes a "reader" when block > 0

#### Defined in

[types.ts:76](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/types.ts#L76)

___

### streams

• **streams**: `Record`<`string`, `string`\> \| `string`[]

Redis stream keys to be read. If a Record is provided each value is the starting id for that stream

#### Defined in

[types.ts:61](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/types.ts#L61)
