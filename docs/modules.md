[redis-x-stream](README.md) / Exports

# redis-x-stream

## Index

### References

* [default](modules.md#default)

### Classes

* [RedisStream](classes/redisstream.md)

### Interfaces

* [RedisStreamOptions](interfaces/redisstreamoptions.md)

### Type aliases

* [Mode](modules.md#mode)

## References

### default

Renames and exports: [RedisStream](classes/redisstream.md)

## Type aliases

### Mode

Ƭ **Mode**: *entry* \| *stream* \| *batch*

`'entry'` mode is default and will iterate over each stream entry in each stream in the result set

`'stream'` mode will iterate over each XREAD[GROUP] stream result

`'batch'` mode will iterate over each XREAD[GROUP] call result

**`default`** `'entry'`

Defined in: [types.ts:35](https://github.com/calebboyd/pez/blob/91a6433/src/types.ts#L35)
