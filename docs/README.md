redis-x-stream / [Exports](modules.md)

# redis-x-stream

An [async iterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator) that emits redis stream entries.
Requires Redis 5 or greater.

## Getting Started

```javascript
import { RedisStream } from 'redis-x-stream'

for await (const [stream, entry] of new RedisStream('myStream')) {
  //process an entry
}
```

## Usage

See [API Docs](docs/classes/redisstream.md#constructor)

## TODO
- [x] xread batch
- [x] xread stream
- [x] xread entry
- [x] xreadgroup entry
- [ ] xreadgroup stream
- [ ] xreadgroup batch
- [ ] documentation

## Maybe TODO
- [ ] eager load?
- [ ] Controller for UNBLOCK on .quit
