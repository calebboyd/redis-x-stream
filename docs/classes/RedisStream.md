[redis-x-stream](../README.md) / [Exports](../modules.md) / RedisStream

# Class: RedisStream

## Table of contents

### Constructors

- [constructor](RedisStream.md#constructor)

### Properties

- [ackOnIterate](RedisStream.md#ackoniterate)
- [block](RedisStream.md#block)
- [blocked](RedisStream.md#blocked)
- [buffers](RedisStream.md#buffers)
- [client](RedisStream.md#client)
- [consumer](RedisStream.md#consumer)
- [control](RedisStream.md#control)
- [count](RedisStream.md#count)
- [deleteOnAck](RedisStream.md#deleteonack)
- [done](RedisStream.md#done)
- [draining](RedisStream.md#draining)
- [first](RedisStream.md#first)
- [group](RedisStream.md#group)
- [noack](RedisStream.md#noack)
- [pendingAcks](RedisStream.md#pendingacks)
- [streams](RedisStream.md#streams)

### Methods

- [[asyncIterator]](RedisStream.md#[asynciterator])
- [ack](RedisStream.md#ack)
- [addStream](RedisStream.md#addstream)
- [drain](RedisStream.md#drain)
- [end](RedisStream.md#end)
- [quit](RedisStream.md#quit)
- [return](RedisStream.md#return)

## Constructors

### constructor

• **new RedisStream**(`options`, ...`streams`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `string` \| [`RedisStreamOptions`](../interfaces/RedisStreamOptions.md) |
| `...streams` | `string`[] |

#### Defined in

[stream.ts:82](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L82)

## Properties

### ackOnIterate

• **ackOnIterate**: `boolean` = `false`

#### Defined in

[stream.ts:44](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L44)

___

### block

• `Optional` **block**: `number`

#### Defined in

[stream.ts:40](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L40)

___

### blocked

• `Readonly` **blocked**: `boolean` = `false`

#### Defined in

[stream.ts:34](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L34)

___

### buffers

• **buffers**: `boolean` = `false`

#### Defined in

[stream.ts:41](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L41)

___

### client

• `Readonly` **client**: `Redis`

#### Defined in

[stream.ts:30](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L30)

___

### consumer

• `Optional` `Readonly` **consumer**: `string`

#### Defined in

[stream.ts:33](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L33)

___

### control

• `Optional` `Readonly` **control**: `Redis`

#### Defined in

[stream.ts:31](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L31)

___

### count

• **count**: `number` = `100`

#### Defined in

[stream.ts:38](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L38)

___

### deleteOnAck

• **deleteOnAck**: `boolean` = `false`

#### Defined in

[stream.ts:45](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L45)

___

### done

• **done**: `boolean` = `false`

Flag for iterable state

#### Defined in

[stream.ts:57](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L57)

___

### draining

• **draining**: `boolean` = `false`

#### Defined in

[stream.ts:59](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L59)

___

### first

• **first**: `boolean` = `false`

#### Defined in

[stream.ts:58](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L58)

___

### group

• `Optional` `Readonly` **group**: `string`

#### Defined in

[stream.ts:32](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L32)

___

### noack

• **noack**: `boolean` = `false`

#### Defined in

[stream.ts:39](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L39)

___

### pendingAcks

• **pendingAcks**: `Map`<`string`, `string`[]\>

Acks waiting to be sent on either:
- interval
- async iteration

#### Defined in

[stream.ts:53](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L53)

___

### streams

• **streams**: `Map`<`string`, `string`\>

#### Defined in

[stream.ts:37](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L37)

## Methods

### [asyncIterator]

▸ **[asyncIterator]**(): `AsyncIterator`<`XEntryResult`, `any`, `undefined`\>

#### Returns

`AsyncIterator`<`XEntryResult`, `any`, `undefined`\>

#### Defined in

[stream.ts:160](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L160)

___

### ack

▸ **ack**(`stream`, ...`ids`): `undefined`

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `string` |
| `...ids` | `string`[] |

#### Returns

`undefined`

#### Defined in

[stream.ts:226](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L226)

___

### addStream

▸ **addStream**(`streamName`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `streamName` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[stream.ts:250](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L250)

___

### drain

▸ **drain**(): `Promise`<`void`\>

Iterate through remaining items in the PEL and exit

#### Returns

`Promise`<`void`\>

#### Defined in

[stream.ts:258](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L258)

___

### end

▸ **end**(): `Promise`<`void`\>

Immediately stop processing entries

#### Returns

`Promise`<`void`\>

#### Defined in

[stream.ts:266](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L266)

___

### quit

▸ **quit**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[stream.ts:212](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L212)

___

### return

▸ `Protected` **return**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[stream.ts:277](https://github.com/calebboyd/redis-x-stream/blob/db326b7/src/stream.ts#L277)
