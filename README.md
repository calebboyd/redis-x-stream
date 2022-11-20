# redis-x-stream

An [async iterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator) that emits redis stream entries.
Requires Redis 5 or greater.

## Getting Started

```javascript
import { RedisStream } from 'redis-x-stream'
import Redis from 'ioredis'

const myStream = 'my-stream'
await populate(myStream, 1e5)

let i = 0
for await (const [streamName, [id, keyvals]] of new RedisStream(myStream)) {
  i++;
}
console.log(`read ${i} stream entries from ${myStream}`)

async function populate(stream, count) {
  const writer = new Redis({ enableAutoPipelining: true })
  await Promise.all(
    Array.from(Array(count), (_, j) => writer.xadd(stream, '*', 'index', j))
  )
  writer.quit()
  await new Promise(resolve => writer.once('close', resolve))
  console.log(`wrote ${count} stream entries to ${stream}`)
}
```
## Usage

See the [API Docs](docs/classes/RedisStream.md#constructor) for available options.

