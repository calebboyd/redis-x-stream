[redis-x-stream](../README.md) / [Exports](../modules.md) / RedisStream

# Class: RedisStream<T\>

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Mode`](../modules.md#mode) = ``"entry"`` |

## Table of contents

### Constructors

- [constructor](RedisStream.md#constructor)

### Properties

- [ackOnIterate](RedisStream.md#ackoniterate)
- [block](RedisStream.md#block)
- [buffers](RedisStream.md#buffers)
- [client](RedisStream.md#client)
- [consumer](RedisStream.md#consumer)
- [count](RedisStream.md#count)
- [deleteOnAck](RedisStream.md#deleteonack)
- [done](RedisStream.md#done)
- [first](RedisStream.md#first)
- [group](RedisStream.md#group)
- [mode](RedisStream.md#mode)
- [noack](RedisStream.md#noack)
- [pendingAcks](RedisStream.md#pendingacks)
- [streams](RedisStream.md#streams)

### Methods

- [[asyncIterator]](RedisStream.md#[asynciterator])
- [ack](RedisStream.md#ack)
- [quit](RedisStream.md#quit)
- [return](RedisStream.md#return)

## Constructors

### constructor

• **new RedisStream**<`T`\>(`options`, ...`streams`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Mode`](../modules.md#mode) = ``"entry"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `string` \| [`RedisStreamOptions`](../interfaces/RedisStreamOptions.md)<`T`\> |
| `...streams` | `string`[] |

#### Defined in

[stream.ts:63](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L63)

## Properties

### ackOnIterate

• **ackOnIterate**: `boolean` = `false`

#### Defined in

[stream.ts:35](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L35)

___

### block

• `Optional` **block**: `number`

#### Defined in

[stream.ts:31](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L31)

___

### buffers

• **buffers**: `boolean` = `false`

#### Defined in

[stream.ts:32](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L32)

___

### client

• `Readonly` **client**: `Redis`

#### Defined in

[stream.ts:23](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L23)

___

### consumer

• `Optional` `Readonly` **consumer**: `string`

#### Defined in

[stream.ts:25](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L25)

___

### count

• **count**: `number` = `100`

#### Defined in

[stream.ts:29](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L29)

___

### deleteOnAck

• **deleteOnAck**: `boolean` = `false`

#### Defined in

[stream.ts:36](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L36)

___

### done

• **done**: `boolean` = `false`

Flag for iterable state

#### Defined in

[stream.ts:48](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L48)

___

### first

• **first**: `boolean` = `false`

#### Defined in

[stream.ts:49](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L49)

___

### group

• `Optional` `Readonly` **group**: `string`

#### Defined in

[stream.ts:24](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L24)

___

### mode

• `Readonly` **mode**: [`Mode`](../modules.md#mode) = `'entry'`

'entry' mode will dispense each entry of each stream
'stream' mode will dispense each stream containing entries
'batch' mode will dispense all streams with all entries

#### Defined in

[stream.ts:22](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L22)

___

### noack

• **noack**: `boolean` = `false`

#### Defined in

[stream.ts:30](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L30)

___

### pendingAcks

• **pendingAcks**: `Map`<`string`, `string`[]\>

Acks waiting to be sent on either:
- timeout
- async iteration

#### Defined in

[stream.ts:44](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L44)

___

### streams

• **streams**: `Map`<`string`, `string`\>

#### Defined in

[stream.ts:28](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L28)

## Methods

### [asyncIterator]

▸ **[asyncIterator]**(): `AsyncIterator`<`T` extends ``"entry"`` ? `XEntryResult` : `T` extends ``"batch"`` ? `XStreamResult`[] : `XStreamResult`, `any`, `undefined`\>

#### Returns

`AsyncIterator`<`T` extends ``"entry"`` ? `XEntryResult` : `T` extends ``"batch"`` ? `XStreamResult`[] : `XStreamResult`, `any`, `undefined`\>

#### Defined in

[stream.ts:124](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L124)

___

### ack

▸ **ack**(`stream`, ...`ids`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `string` |
| `...ids` | `string`[] |

#### Returns

`void`

#### Defined in

[stream.ts:179](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L179)

___

### quit

▸ **quit**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[stream.ts:168](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L168)

___

### return

▸ `Protected` **return**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[stream.ts:188](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L188)
