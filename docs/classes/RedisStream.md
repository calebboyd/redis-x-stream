[redis-x-stream](../README.md) / [Exports](../modules.md) / RedisStream

# Class: RedisStream

## Table of contents

### Constructors

- [constructor](RedisStream.md#constructor)

### Properties

- [ackOnIterate](RedisStream.md#ackoniterate)
- [block](RedisStream.md#block)
- [buffers](RedisStream.md#buffers)
- [client](RedisStream.md#client)
- [consumer](RedisStream.md#consumer)
- [control](RedisStream.md#control)
- [count](RedisStream.md#count)
- [deleteOnAck](RedisStream.md#deleteonack)
- [done](RedisStream.md#done)
- [first](RedisStream.md#first)
- [group](RedisStream.md#group)
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

• **new RedisStream**(`options`, ...`streams`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `string` \| [`RedisStreamOptions`](../interfaces/RedisStreamOptions.md) |
| `...streams` | `string`[] |

#### Defined in

[stream.ts:75](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L75)

## Properties

### ackOnIterate

• **ackOnIterate**: `boolean` = `false`

#### Defined in

[stream.ts:43](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L43)

___

### block

• `Optional` **block**: `number`

#### Defined in

[stream.ts:39](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L39)

___

### buffers

• **buffers**: `boolean` = `false`

#### Defined in

[stream.ts:40](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L40)

___

### client

• `Readonly` **client**: `Redis`

#### Defined in

[stream.ts:30](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L30)

___

### consumer

• `Optional` `Readonly` **consumer**: `string`

#### Defined in

[stream.ts:33](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L33)

___

### control

• `Optional` `Readonly` **control**: `Redis`

#### Defined in

[stream.ts:31](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L31)

___

### count

• **count**: `number` = `100`

#### Defined in

[stream.ts:37](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L37)

___

### deleteOnAck

• **deleteOnAck**: `boolean` = `false`

#### Defined in

[stream.ts:44](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L44)

___

### done

• **done**: `boolean` = `false`

Flag for iterable state

#### Defined in

[stream.ts:56](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L56)

___

### first

• **first**: `boolean` = `false`

#### Defined in

[stream.ts:57](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L57)

___

### group

• `Optional` `Readonly` **group**: `string`

#### Defined in

[stream.ts:32](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L32)

___

### noack

• **noack**: `boolean` = `false`

#### Defined in

[stream.ts:38](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L38)

___

### pendingAcks

• **pendingAcks**: `Map`<`string`, `string`[]\>

Acks waiting to be sent on either:
- interval
- async iteration

#### Defined in

[stream.ts:52](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L52)

___

### streams

• **streams**: `Map`<`string`, `string`\>

#### Defined in

[stream.ts:36](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L36)

## Methods

### [asyncIterator]

▸ **[asyncIterator]**(): `AsyncIterator`<`XEntryResult`, `any`, `undefined`\>

#### Returns

`AsyncIterator`<`XEntryResult`, `any`, `undefined`\>

#### Defined in

[stream.ts:145](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L145)

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

[stream.ts:204](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L204)

___

### quit

▸ **quit**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[stream.ts:190](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L190)

___

### return

▸ `Protected` **return**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[stream.ts:214](https://github.com/calebboyd/redis-x-stream/blob/52317a3/src/stream.ts#L214)
