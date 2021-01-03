[redis-x-stream](../README.md) / [Exports](../modules.md) / RedisStream

# Class: RedisStream<T\>

## Type parameters

Name | Type | Default |
------ | ------ | ------ |
`T` | [*Mode*](../modules.md#mode) | *entry* |

## Hierarchy

* **RedisStream**

## Index

### Constructors

* [constructor](redisstream.md#constructor)

### Properties

* [ackOnIterate](redisstream.md#ackoniterate)
* [block](redisstream.md#block)
* [client](redisstream.md#client)
* [consumer](redisstream.md#consumer)
* [count](redisstream.md#count)
* [createdConnection](redisstream.md#createdconnection)
* [deleteOnAck](redisstream.md#deleteonack)
* [done](redisstream.md#done)
* [first](redisstream.md#first)
* [group](redisstream.md#group)
* [mode](redisstream.md#mode)
* [noack](redisstream.md#noack)
* [pendingAcks](redisstream.md#pendingacks)
* [streams](redisstream.md#streams)

### Methods

* [[Symbol.asyncIterator]](redisstream.md#[symbol.asynciterator])
* [ack](redisstream.md#ack)
* [quit](redisstream.md#quit)
* [return](redisstream.md#return)

## Constructors

### constructor

\+ **new RedisStream**<T\>(`options`: *string* \| [*RedisStreamOptions*](../interfaces/redisstreamoptions.md)<T\>, ...`streams`: *string*[]): [*RedisStream*](redisstream.md)<T\>

#### Type parameters:

Name | Type | Default |
------ | ------ | ------ |
`T` | [*Mode*](../modules.md#mode) | *entry* |

#### Parameters:

Name | Type |
------ | ------ |
`options` | *string* \| [*RedisStreamOptions*](../interfaces/redisstreamoptions.md)<T\> |
`...streams` | *string*[] |

**Returns:** [*RedisStream*](redisstream.md)<T\>

Defined in: [stream.ts:58](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L58)

## Properties

### ackOnIterate

• **ackOnIterate**: *boolean*= false

Defined in: [stream.ts:37](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L37)

___

### block

• `Optional` **block**: *undefined* \| *number*

Defined in: [stream.ts:34](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L34)

___

### client

• `Readonly` **client**: *Redis*

Defined in: [stream.ts:26](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L26)

___

### consumer

• `Optional` `Readonly` **consumer**: *undefined* \| *string*

Defined in: [stream.ts:28](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L28)

___

### count

• **count**: *number*= 100

Defined in: [stream.ts:32](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L32)

___

### createdConnection

• `Private` **createdConnection**: *boolean*= true

Did we create the redis connection?

Defined in: [stream.ts:58](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L58)

___

### deleteOnAck

• **deleteOnAck**: *boolean*= false

Defined in: [stream.ts:38](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L38)

___

### done

• **done**: *boolean*= false

Flag for iterable state

Defined in: [stream.ts:50](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L50)

___

### first

• **first**: *boolean*= false

Flag for first iteration

Defined in: [stream.ts:54](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L54)

___

### group

• `Optional` `Readonly` **group**: *undefined* \| *string*

Defined in: [stream.ts:27](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L27)

___

### mode

• `Readonly` **mode**: [*Mode*](../modules.md#mode)= 'entry'

'entry' mode will dispense each entry of each stream
'stream' mode will dispense each stream containing entries
'batch' mode will dispense all streams with all entries

Defined in: [stream.ts:25](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L25)

___

### noack

• **noack**: *boolean*= false

Defined in: [stream.ts:33](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L33)

___

### pendingAcks

• **pendingAcks**: *Map*<*string*, *string*[]\>

Acks waiting to be sent on either:
- timeout
- async iteration

Defined in: [stream.ts:46](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L46)

___

### streams

• **streams**: *Map*<*string*, *string*\>

Defined in: [stream.ts:31](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L31)

## Methods

### [Symbol.asyncIterator]

▸ **[Symbol.asyncIterator]**(): *AsyncIterator*<T *extends* *entry* ? XEntryResult : T *extends* *batch* ? XStreamResult[] : XStreamResult, *any*, *undefined*\>

**Returns:** *AsyncIterator*<T *extends* *entry* ? XEntryResult : T *extends* *batch* ? XStreamResult[] : XStreamResult, *any*, *undefined*\>

Defined in: [stream.ts:117](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L117)

___

### ack

▸ **ack**(`stream`: *string*, ...`ids`: *string*[]): *void*

#### Parameters:

Name | Type |
------ | ------ |
`stream` | *string* |
`...ids` | *string*[] |

**Returns:** *void*

Defined in: [stream.ts:142](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L142)

___

### quit

▸ **quit**(): *Promise*<*void*\>

**Returns:** *Promise*<*void*\>

Defined in: [stream.ts:131](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L131)

___

### return

▸ `Protected`**return**(): *Promise*<*IteratorReturnResult*<*void*\>\>

**Returns:** *Promise*<*IteratorReturnResult*<*void*\>\>

Defined in: [stream.ts:151](https://github.com/calebboyd/pez/blob/557aceb/src/stream.ts#L151)
