[redis-x-stream](../README.md) / [Exports](../modules.md) / RedisStreamOptions

# Interface: RedisStreamOptions<T\>

## Type parameters

Name | Type |
------ | ------ |
`T` | [*Mode*](../modules.md#mode) |

## Hierarchy

* **RedisStreamOptions**

## Index

### Properties

* [ackOnIterate](redisstreamoptions.md#ackoniterate)
* [block](redisstreamoptions.md#block)
* [consumer](redisstreamoptions.md#consumer)
* [count](redisstreamoptions.md#count)
* [deleteOnAck](redisstreamoptions.md#deleteonack)
* [flushPendingAckCount](redisstreamoptions.md#flushpendingackcount)
* [flushPendingAckInterval](redisstreamoptions.md#flushpendingackinterval)
* [group](redisstreamoptions.md#group)
* [mode](redisstreamoptions.md#mode)
* [noack](redisstreamoptions.md#noack)
* [redis](redisstreamoptions.md#redis)
* [streams](redisstreamoptions.md#streams)

## Properties

### ackOnIterate

• `Optional` **ackOnIterate**: *undefined* \| *true*

If set to `true` Iterables utilizing consumer groups will
automatically queue acknowledgments for previously iterated entries.

**`default`** undefined

Defined in: [types.ts:87](https://github.com/calebboyd/pez/blob/557aceb/src/types.ts#L87)

___

### block

• `Optional` **block**: *undefined* \| *number*

The longest amount of time in milliseconds the dispenser should block
while waiting for new entries on any stream, passed to xread or xreadgroup

Defined in: [types.ts:81](https://github.com/calebboyd/pez/blob/557aceb/src/types.ts#L81)

___

### consumer

• `Optional` **consumer**: *undefined* \| *string*

The consumer.
Note: if only consumer is provided, a group is created automatically

Defined in: [types.ts:65](https://github.com/calebboyd/pez/blob/557aceb/src/types.ts#L65)

___

### count

• `Optional` **count**: *undefined* \| *number*

The maximum number of entries to retrieve in a single read operation
eg. the "highWaterMark"

**`default`** 100

Defined in: [types.ts:76](https://github.com/calebboyd/pez/blob/557aceb/src/types.ts#L76)

___

### deleteOnAck

• `Optional` **deleteOnAck**: *undefined* \| *true*

If set to `true` Iterables utilizing consumer groups will
automatically delete entries after acknowledgment

**`default`** undefined

Defined in: [types.ts:93](https://github.com/calebboyd/pez/blob/557aceb/src/types.ts#L93)

___

### flushPendingAckCount

• `Optional` **flushPendingAckCount**: *undefined* \| *number*

The number of entries to buffer for acknowledgment at the same time.
Removes items from the Redis PEL

The closer the flushPendingAckCount is to 1 the closer to achieving "exactly once delivery"
At the cost of more frequent redis calls. Default behavior for redis streams can be considered "at least once"

The higher flushPendingAckCount is - a stream failure/recovery could deliver messages more than once from the PEL

Defaults to the same value as `.count`

TODO: not yet implemented

**`default`** 100

Defined in: [types.ts:113](https://github.com/calebboyd/pez/blob/557aceb/src/types.ts#L113)

___

### flushPendingAckInterval

• `Optional` **flushPendingAckInterval**: *undefined* \| *number*

If iteration is slow, set this to the maximum amount of time that should elapse before pending acks will be flushed
This counter is reset after each iteration or ack

TODO: not yet implemented

Defined in: [types.ts:120](https://github.com/calebboyd/pez/blob/557aceb/src/types.ts#L120)

___

### group

• `Optional` **group**: *undefined* \| *string*

The consumer group.
Note: if only a group is provided a consumer is created automatically

Defined in: [types.ts:60](https://github.com/calebboyd/pez/blob/557aceb/src/types.ts#L60)

___

### mode

• `Optional` **mode**: *undefined* \| T

`'entry'` mode is default and will iterate over each stream entry in each stream in the result set

`'stream'` mode will iterate over each XREAD[GROUP] stream result

`'batch'` mode will iterate over each XREAD[GROUP] call result

**`default`** `'entry'`

Defined in: [types.ts:51](https://github.com/calebboyd/pez/blob/557aceb/src/types.ts#L51)

___

### noack

• `Optional` **noack**: *undefined* \| *true*

Pass the NOACK flag to calls to xreadgroup bypassing the Redis PEL

**`default`** `false`

Defined in: [types.ts:98](https://github.com/calebboyd/pez/blob/557aceb/src/types.ts#L98)

___

### redis

• `Optional` **redis**: *undefined* \| *string* \| *Redis* \| RedisOptions

The IORedis client connection.
NOTE: by default this connection becomes a "reader" when block > 0

Defined in: [types.ts:70](https://github.com/calebboyd/pez/blob/557aceb/src/types.ts#L70)

___

### streams

• **streams**: *string*[] \| *Record*<*string*, *string*\>

Redis stream keys to be read. If a Record is provided each value is the starting id for that stream

Defined in: [types.ts:55](https://github.com/calebboyd/pez/blob/557aceb/src/types.ts#L55)
