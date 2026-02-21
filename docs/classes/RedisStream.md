[**redis-x-stream**](../README.md)

***

[redis-x-stream](../globals.md) / RedisStream

# Class: RedisStream\<T\>

Defined in: [src/stream.ts:62](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L62)

## Extends

- `EventEmitter`

## Type Parameters

### T

`T` = `StreamEntryKeyValues`

## Constructors

### Constructor

> **new RedisStream**\<`T`\>(`options`, ...`streams`): `RedisStream`\<`T`\>

Defined in: [src/stream.ts:122](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L122)

#### Parameters

##### options

`string` | [`RedisStreamOptions`](../interfaces/RedisStreamOptions.md)\<`T`\>

##### streams

...`string`[]

#### Returns

`RedisStream`\<`T`\>

#### Overrides

`EventEmitter.constructor`

## Properties

### ackOnIterate

> **ackOnIterate**: `boolean` = `false`

Defined in: [src/stream.ts:77](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L77)

***

### addedStreams

> **addedStreams**: `Iterable`\<\[`string`, `string`\], `any`, `any`\> \| `null` = `null`

Defined in: [src/stream.ts:97](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L97)

***

### block?

> `optional` **block**: `number`

Defined in: [src/stream.ts:73](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L73)

***

### blocked

> `readonly` **blocked**: `boolean` = `false`

Defined in: [src/stream.ts:67](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L67)

***

### buffers

> **buffers**: `boolean` = `false`

Defined in: [src/stream.ts:74](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L74)

***

### claimCursors

> **claimCursors**: `Map`\<`string`, `string`\>

Defined in: [src/stream.ts:99](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L99)

***

### claimIdleTime

> **claimIdleTime**: `number` \| `null` = `null`

Defined in: [src/stream.ts:80](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L80)

***

### client

> `readonly` **client**: `Redis`

Defined in: [src/stream.ts:63](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L63)

***

### consumer?

> `readonly` `optional` **consumer**: `string`

Defined in: [src/stream.ts:66](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L66)

***

### control?

> `readonly` `optional` **control**: `Redis`

Defined in: [src/stream.ts:64](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L64)

***

### count

> **count**: `number` = `100`

Defined in: [src/stream.ts:71](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L71)

***

### deleteOnAck

> **deleteOnAck**: `boolean` = `false`

Defined in: [src/stream.ts:78](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L78)

***

### done

> **done**: `boolean` = `false`

Defined in: [src/stream.ts:93](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L93)

Flag for iterable state

***

### draining

> **draining**: `boolean` = `false`

Defined in: [src/stream.ts:95](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L95)

***

### first

> **first**: `boolean` = `false`

Defined in: [src/stream.ts:94](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L94)

***

### flushPendingAckInterval

> **flushPendingAckInterval**: `number` \| `null` = `null`

Defined in: [src/stream.ts:79](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L79)

***

### group?

> `readonly` `optional` **group**: `string`

Defined in: [src/stream.ts:65](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L65)

***

### noack

> **noack**: `boolean` = `false`

Defined in: [src/stream.ts:72](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L72)

***

### pelDrainStreams

> **pelDrainStreams**: `Set`\<`string`\> \| `null` = `null`

Defined in: [src/stream.ts:98](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L98)

***

### pendingAcks

> **pendingAcks**: `Map`\<`string`, `string`[]\>

Defined in: [src/stream.ts:89](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L89)

Acks waiting to be sent on either:
- interval
- async iteration

***

### reading

> **reading**: `boolean` = `false`

Defined in: [src/stream.ts:96](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L96)

***

### streams

> **streams**: `Map`\<`string`, `string`\>

Defined in: [src/stream.ts:70](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L70)

## Methods

### \[asyncIterator\]()

> **\[asyncIterator\]**(): `AsyncIterator`\<\[`string`, \[`string`, `T`\]\]\>

Defined in: [src/stream.ts:296](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L296)

#### Returns

`AsyncIterator`\<\[`string`, \[`string`, `T`\]\]\>

***

### \[captureRejectionSymbol\]()?

> `optional` **\[captureRejectionSymbol\]**(`error`, `event`, ...`args`): `void`

Defined in: node\_modules/@types/node/events.d.ts:123

The `Symbol.for('nodejs.rejection')` method is called in case a
promise rejection happens when emitting an event and
`captureRejections` is enabled on the emitter.
It is possible to use `events.captureRejectionSymbol` in
place of `Symbol.for('nodejs.rejection')`.

```js
import { EventEmitter, captureRejectionSymbol } from 'node:events';

class MyClass extends EventEmitter {
  constructor() {
    super({ captureRejections: true });
  }

  [captureRejectionSymbol](err, event, ...args) {
    console.log('rejection happened for', event, 'with', err, ...args);
    this.destroy(err);
  }

  destroy(err) {
    // Tear the resource down here.
  }
}
```

#### Parameters

##### error

`Error`

##### event

`string` | `symbol`

##### args

...`any`[]

#### Returns

`void`

#### Since

v13.4.0, v12.16.0

#### Inherited from

`EventEmitter.[captureRejectionSymbol]`

***

### ack()

> **ack**(`stream`, ...`ids`): `undefined`

Defined in: [src/stream.ts:386](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L386)

#### Parameters

##### stream

`string`

##### ids

...`string`[]

#### Returns

`undefined`

***

### addListener()

> **addListener**\<`E`\>(`eventName`, `listener`): `this`

Defined in: node\_modules/@types/node/events.d.ts:128

Alias for `emitter.on(eventName, listener)`.

#### Type Parameters

##### E

`E` *extends* `string` \| `symbol`

#### Parameters

##### eventName

`string` | `symbol`

##### listener

(...`args`) => `void`

#### Returns

`this`

#### Since

v0.1.26

#### Inherited from

`EventEmitter.addListener`

***

### addStream()

> **addStream**(`streams`): `Promise`\<`void`\>

Defined in: [src/stream.ts:431](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L431)

#### Parameters

##### streams

`string` | `Record`\<`string`, `string`\> | `string`[] | `undefined`

#### Returns

`Promise`\<`void`\>

***

### consumers()

> **consumers**(`stream?`): `Promise`\<[`ConsumerInfo`](../interfaces/ConsumerInfo.md)[]\>

Defined in: [src/stream.ts:250](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L250)

Returns consumer information via XINFO CONSUMERS for the configured
group on the given stream (or the first configured stream if omitted).

#### Parameters

##### stream?

`string`

#### Returns

`Promise`\<[`ConsumerInfo`](../interfaces/ConsumerInfo.md)[]\>

***

### drain()

> **drain**(): `Promise`\<`void`\>

Defined in: [src/stream.ts:441](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L441)

Iterate through remaining items in the PEL and exit

#### Returns

`Promise`\<`void`\>

***

### emit()

> **emit**\<`K`\>(`event`, ...`args`): `boolean`

Defined in: [src/stream.ts:289](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L289)

Synchronously calls each of the listeners registered for the event named
`eventName`, in the order they were registered, passing the supplied arguments
to each.

Returns `true` if the event had listeners, `false` otherwise.

```js
import { EventEmitter } from 'node:events';
const myEmitter = new EventEmitter();

// First listener
myEmitter.on('event', function firstListener() {
  console.log('Helloooo! first listener');
});
// Second listener
myEmitter.on('event', function secondListener(arg1, arg2) {
  console.log(`event with parameters ${arg1}, ${arg2} in second listener`);
});
// Third listener
myEmitter.on('event', function thirdListener(...args) {
  const parameters = args.join(', ');
  console.log(`event with parameters ${parameters} in third listener`);
});

console.log(myEmitter.listeners('event'));

myEmitter.emit('event', 1, 2, 3, 4, 5);

// Prints:
// [
//   [Function: firstListener],
//   [Function: secondListener],
//   [Function: thirdListener]
// ]
// Helloooo! first listener
// event with parameters 1, 2 in second listener
// event with parameters 1, 2, 3, 4, 5 in third listener
```

#### Type Parameters

##### K

`K` *extends* keyof [`RedisStreamEvents`](../interfaces/RedisStreamEvents.md)

#### Parameters

##### event

`K`

##### args

...`Parameters`\<[`RedisStreamEvents`](../interfaces/RedisStreamEvents.md)\[`K`\]\>

#### Returns

`boolean`

#### Since

v0.1.26

#### Overrides

`EventEmitter.emit`

***

### eventNames()

> **eventNames**(): (`string` \| `symbol`)[]

Defined in: node\_modules/@types/node/events.d.ts:190

Returns an array listing the events for which the emitter has registered
listeners.

```js
import { EventEmitter } from 'node:events';

const myEE = new EventEmitter();
myEE.on('foo', () => {});
myEE.on('bar', () => {});

const sym = Symbol('symbol');
myEE.on(sym, () => {});

console.log(myEE.eventNames());
// Prints: [ 'foo', 'bar', Symbol(symbol) ]
```

#### Returns

(`string` \| `symbol`)[]

#### Since

v6.0.0

#### Inherited from

`EventEmitter.eventNames`

***

### flush()

> **flush**(`client?`): `Promise`\<`void`\>

Defined in: [src/stream.ts:451](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L451)

Flush any acknowledgements that were added potentially after the stream finished.

#### Parameters

##### client?

`Redis`

#### Returns

`Promise`\<`void`\>

***

### getMaxListeners()

> **getMaxListeners**(): `number`

Defined in: node\_modules/@types/node/events.d.ts:197

Returns the current max listener value for the `EventEmitter` which is either
set by `emitter.setMaxListeners(n)` or defaults to
`events.defaultMaxListeners`.

#### Returns

`number`

#### Since

v1.0.0

#### Inherited from

`EventEmitter.getMaxListeners`

***

### groups()

> **groups**(`stream?`): `Promise`\<[`GroupInfo`](../interfaces/GroupInfo.md)[]\>

Defined in: [src/stream.ts:238](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L238)

Returns consumer group information via XINFO GROUPS for the given stream
(or the first configured stream if omitted).

#### Parameters

##### stream?

`string`

#### Returns

`Promise`\<[`GroupInfo`](../interfaces/GroupInfo.md)[]\>

***

### info()

> **info**(): `Promise`\<`Map`\<`string`, [`StreamInfo`](../interfaces/StreamInfo.md)\>\>

Defined in: [src/stream.ts:223](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L223)

Returns stream metadata via XINFO STREAM for each configured stream.

#### Returns

`Promise`\<`Map`\<`string`, [`StreamInfo`](../interfaces/StreamInfo.md)\>\>

***

### listenerCount()

> **listenerCount**\<`E`\>(`eventName`, `listener?`): `number`

Defined in: node\_modules/@types/node/events.d.ts:206

Returns the number of listeners listening for the event named `eventName`.
If `listener` is provided, it will return how many times the listener is found
in the list of the listeners of the event.

#### Type Parameters

##### E

`E` *extends* `string` \| `symbol`

#### Parameters

##### eventName

The name of the event being listened for

`string` | `symbol`

##### listener?

(...`args`) => `void`

The event handler function

#### Returns

`number`

#### Since

v3.2.0

#### Inherited from

`EventEmitter.listenerCount`

***

### listeners()

> **listeners**\<`E`\>(`eventName`): (...`args`) => `void`[]

Defined in: node\_modules/@types/node/events.d.ts:222

Returns a copy of the array of listeners for the event named `eventName`.

```js
server.on('connection', (stream) => {
  console.log('someone connected!');
});
console.log(util.inspect(server.listeners('connection')));
// Prints: [ [Function] ]
```

#### Type Parameters

##### E

`E` *extends* `string` \| `symbol`

#### Parameters

##### eventName

`string` | `symbol`

#### Returns

(...`args`) => `void`[]

#### Since

v0.1.26

#### Inherited from

`EventEmitter.listeners`

***

### off()

> **off**\<`E`\>(`eventName`, `listener`): `this`

Defined in: node\_modules/@types/node/events.d.ts:227

Alias for `emitter.removeListener()`.

#### Type Parameters

##### E

`E` *extends* `string` \| `symbol`

#### Parameters

##### eventName

`string` | `symbol`

##### listener

(...`args`) => `void`

#### Returns

`this`

#### Since

v10.0.0

#### Inherited from

`EventEmitter.off`

***

### on()

> **on**\<`K`\>(`event`, `listener`): `this`

Defined in: [src/stream.ts:282](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L282)

Adds the `listener` function to the end of the listeners array for the
event named `eventName`. No checks are made to see if the `listener` has
already been added. Multiple calls passing the same combination of `eventName`
and `listener` will result in the `listener` being added, and called, multiple
times.

```js
server.on('connection', (stream) => {
  console.log('someone connected!');
});
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

By default, event listeners are invoked in the order they are added. The
`emitter.prependListener()` method can be used as an alternative to add the
event listener to the beginning of the listeners array.

```js
import { EventEmitter } from 'node:events';
const myEE = new EventEmitter();
myEE.on('foo', () => console.log('a'));
myEE.prependListener('foo', () => console.log('b'));
myEE.emit('foo');
// Prints:
//   b
//   a
```

#### Type Parameters

##### K

`K` *extends* keyof [`RedisStreamEvents`](../interfaces/RedisStreamEvents.md)

#### Parameters

##### event

`K`

##### listener

[`RedisStreamEvents`](../interfaces/RedisStreamEvents.md)\[`K`\]

The callback function

#### Returns

`this`

#### Since

v0.1.101

#### Overrides

`EventEmitter.on`

***

### once()

> **once**\<`E`\>(`eventName`, `listener`): `this`

Defined in: node\_modules/@types/node/events.d.ts:292

Adds a **one-time** `listener` function for the event named `eventName`. The
next time `eventName` is triggered, this listener is removed and then invoked.

```js
server.once('connection', (stream) => {
  console.log('Ah, we have our first user!');
});
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

By default, event listeners are invoked in the order they are added. The
`emitter.prependOnceListener()` method can be used as an alternative to add the
event listener to the beginning of the listeners array.

```js
import { EventEmitter } from 'node:events';
const myEE = new EventEmitter();
myEE.once('foo', () => console.log('a'));
myEE.prependOnceListener('foo', () => console.log('b'));
myEE.emit('foo');
// Prints:
//   b
//   a
```

#### Type Parameters

##### E

`E` *extends* `string` \| `symbol`

#### Parameters

##### eventName

The name of the event.

`string` | `symbol`

##### listener

(...`args`) => `void`

The callback function

#### Returns

`this`

#### Since

v0.3.0

#### Inherited from

`EventEmitter.once`

***

### pending()

> **pending**(`stream?`): `Promise`\<[`PendingSummary`](../interfaces/PendingSummary.md)\>

Defined in: [src/stream.ts:263](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L263)

Returns the XPENDING summary for the configured group on the given
stream (or the first configured stream if omitted).

#### Parameters

##### stream?

`string`

#### Returns

`Promise`\<[`PendingSummary`](../interfaces/PendingSummary.md)\>

***

### prependListener()

> **prependListener**\<`E`\>(`eventName`, `listener`): `this`

Defined in: node\_modules/@types/node/events.d.ts:311

Adds the `listener` function to the _beginning_ of the listeners array for the
event named `eventName`. No checks are made to see if the `listener` has
already been added. Multiple calls passing the same combination of `eventName`
and `listener` will result in the `listener` being added, and called, multiple
times.

```js
server.prependListener('connection', (stream) => {
  console.log('someone connected!');
});
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

#### Type Parameters

##### E

`E` *extends* `string` \| `symbol`

#### Parameters

##### eventName

The name of the event.

`string` | `symbol`

##### listener

(...`args`) => `void`

The callback function

#### Returns

`this`

#### Since

v6.0.0

#### Inherited from

`EventEmitter.prependListener`

***

### prependOnceListener()

> **prependOnceListener**\<`E`\>(`eventName`, `listener`): `this`

Defined in: node\_modules/@types/node/events.d.ts:328

Adds a **one-time** `listener` function for the event named `eventName` to the
_beginning_ of the listeners array. The next time `eventName` is triggered, this
listener is removed, and then invoked.

```js
server.prependOnceListener('connection', (stream) => {
  console.log('Ah, we have our first user!');
});
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

#### Type Parameters

##### E

`E` *extends* `string` \| `symbol`

#### Parameters

##### eventName

The name of the event.

`string` | `symbol`

##### listener

(...`args`) => `void`

The callback function

#### Returns

`this`

#### Since

v6.0.0

#### Inherited from

`EventEmitter.prependOnceListener`

***

### quit()

> **quit**(): `Promise`\<`void`\>

Defined in: [src/stream.ts:358](https://github.com/calebboyd/redis-x-stream/blob/1e0e6ac627003b4ba2949a9771c9823b7e511ccb/src/stream.ts#L358)

#### Returns

`Promise`\<`void`\>

***

### rawListeners()

> **rawListeners**\<`E`\>(`eventName`): (...`args`) => `void`[]

Defined in: node\_modules/@types/node/events.d.ts:362

Returns a copy of the array of listeners for the event named `eventName`,
including any wrappers (such as those created by `.once()`).

```js
import { EventEmitter } from 'node:events';
const emitter = new EventEmitter();
emitter.once('log', () => console.log('log once'));

// Returns a new Array with a function `onceWrapper` which has a property
// `listener` which contains the original listener bound above
const listeners = emitter.rawListeners('log');
const logFnWrapper = listeners[0];

// Logs "log once" to the console and does not unbind the `once` event
logFnWrapper.listener();

// Logs "log once" to the console and removes the listener
logFnWrapper();

emitter.on('log', () => console.log('log persistently'));
// Will return a new Array with a single function bound by `.on()` above
const newListeners = emitter.rawListeners('log');

// Logs "log persistently" twice
newListeners[0]();
emitter.emit('log');
```

#### Type Parameters

##### E

`E` *extends* `string` \| `symbol`

#### Parameters

##### eventName

`string` | `symbol`

#### Returns

(...`args`) => `void`[]

#### Since

v9.4.0

#### Inherited from

`EventEmitter.rawListeners`

***

### removeAllListeners()

> **removeAllListeners**\<`E`\>(`eventName?`): `this`

Defined in: node\_modules/@types/node/events.d.ts:374

Removes all listeners, or those of the specified `eventName`.

It is bad practice to remove listeners added elsewhere in the code,
particularly when the `EventEmitter` instance was created by some other
component or module (e.g. sockets or file streams).

Returns a reference to the `EventEmitter`, so that calls can be chained.

#### Type Parameters

##### E

`E` *extends* `string` \| `symbol`

#### Parameters

##### eventName?

`string` | `symbol`

#### Returns

`this`

#### Since

v0.1.26

#### Inherited from

`EventEmitter.removeAllListeners`

***

### removeListener()

> **removeListener**\<`E`\>(`eventName`, `listener`): `this`

Defined in: node\_modules/@types/node/events.d.ts:461

Removes the specified `listener` from the listener array for the event named
`eventName`.

```js
const callback = (stream) => {
  console.log('someone connected!');
};
server.on('connection', callback);
// ...
server.removeListener('connection', callback);
```

`removeListener()` will remove, at most, one instance of a listener from the
listener array. If any single listener has been added multiple times to the
listener array for the specified `eventName`, then `removeListener()` must be
called multiple times to remove each instance.

Once an event is emitted, all listeners attached to it at the
time of emitting are called in order. This implies that any
`removeListener()` or `removeAllListeners()` calls _after_ emitting and
_before_ the last listener finishes execution will not remove them from
`emit()` in progress. Subsequent events behave as expected.

```js
import { EventEmitter } from 'node:events';
class MyEmitter extends EventEmitter {}
const myEmitter = new MyEmitter();

const callbackA = () => {
  console.log('A');
  myEmitter.removeListener('event', callbackB);
};

const callbackB = () => {
  console.log('B');
};

myEmitter.on('event', callbackA);

myEmitter.on('event', callbackB);

// callbackA removes listener callbackB but it will still be called.
// Internal listener array at time of emit [callbackA, callbackB]
myEmitter.emit('event');
// Prints:
//   A
//   B

// callbackB is now removed.
// Internal listener array [callbackA]
myEmitter.emit('event');
// Prints:
//   A
```

Because listeners are managed using an internal array, calling this will
change the position indexes of any listener registered _after_ the listener
being removed. This will not impact the order in which listeners are called,
but it means that any copies of the listener array as returned by
the `emitter.listeners()` method will need to be recreated.

When a single function has been added as a handler multiple times for a single
event (as in the example below), `removeListener()` will remove the most
recently added instance. In the example the `once('ping')`
listener is removed:

```js
import { EventEmitter } from 'node:events';
const ee = new EventEmitter();

function pong() {
  console.log('pong');
}

ee.on('ping', pong);
ee.once('ping', pong);
ee.removeListener('ping', pong);

ee.emit('ping');
ee.emit('ping');
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

#### Type Parameters

##### E

`E` *extends* `string` \| `symbol`

#### Parameters

##### eventName

`string` | `symbol`

##### listener

(...`args`) => `void`

#### Returns

`this`

#### Since

v0.1.26

#### Inherited from

`EventEmitter.removeListener`

***

### setMaxListeners()

> **setMaxListeners**(`n`): `this`

Defined in: node\_modules/@types/node/events.d.ts:472

By default `EventEmitter`s will print a warning if more than `10` listeners are
added for a particular event. This is a useful default that helps finding
memory leaks. The `emitter.setMaxListeners()` method allows the limit to be
modified for this specific `EventEmitter` instance. The value can be set to
`Infinity` (or `0`) to indicate an unlimited number of listeners.

Returns a reference to the `EventEmitter`, so that calls can be chained.

#### Parameters

##### n

`number`

#### Returns

`this`

#### Since

v0.3.5

#### Inherited from

`EventEmitter.setMaxListeners`
