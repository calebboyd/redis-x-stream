[redis-x-stream](README.md) / Exports

# redis-x-stream

## Table of contents

### Classes

- [RedisStream](classes/RedisStream.md)

### Interfaces

- [RedisStreamOptions](interfaces/RedisStreamOptions.md)

### Type Aliases

- [Mode](modules.md#mode)

### Functions

- [default](modules.md#default)

## Type Aliases

### Mode

Ƭ **Mode**: ``"entry"`` \| ``"stream"`` \| ``"batch"``

`'entry'` mode is default and will iterate over each stream entry in each stream in the result set

`'stream'` mode will iterate over each XREAD[GROUP] stream result

`'batch'` mode will iterate over each XREAD[GROUP] call result

**`Default`**

`'entry'`

#### Defined in

[types.ts:35](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/types.ts#L35)

## Functions

### default

▸ **default**<`T`\>(`options`, ...`streams`): [`RedisStream`](classes/RedisStream.md)<`T`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Mode`](modules.md#mode) = ``"entry"`` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `string` \| [`RedisStreamOptions`](interfaces/RedisStreamOptions.md)<`T`\> |
| `...streams` | `string`[] |

#### Returns

[`RedisStream`](classes/RedisStream.md)<`T`\>

#### Defined in

[stream.ts:193](https://github.com/calebboyd/redis-x-stream/blob/b5db328/src/stream.ts#L193)
