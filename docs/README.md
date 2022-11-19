redis-x-stream / [Exports](modules.md)

# redis-x-stream

An [async iterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator) that emits redis stream entries.
Requires Redis 5 or greater.

## Getting Started

```javascript
import stream from 'redis-x-stream'

for await (const [streamName, [id, keyvals]] of stream('myStream')) {
  //process an entry
}
```
## Usage

See [API Docs](docs/classes/redisstream.md#constructor)
