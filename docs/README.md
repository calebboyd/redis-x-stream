redis-x-stream / [Exports](modules.md)

# redis-x-stream

An [async iterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator) that emits redis stream entries.
Requires Redis 5 or greater.

![release](https://badgen.net/github/release/calebboyd/redis-x-stream)
![license](https://badgen.net/badge/license/MIT/blue)

![test](https://github.com/calebboyd/redis-x-stream/actions/workflows/test.yml/badge.svg
)
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

## Advanced Usage

### Task Processing

If you have a cluster of processes reading redis stream entries you likely want to utilize redis consumer groups

A task processing application may look like the following:

```javascript
const control = { /* some control event emitter */ }
const stream = new RedisStream({
  streams: ['my-stream'],
  group: ' ',
  //eg. k8s StatefulSet hostname. or Cloud Foundry instance index
  consumer: 'tpc_' + process.env.SOME_ORDINAL_IDENTIFIER,
  block: Infinity,
  count: 10
  ackOnIterate: true,
  deleteOnAck: true,
})

control.on('new-source', (streamName) => {
  //Add an additional source stream to a blocked stream.
  stream.addStream(streamName)
})
control.on('shutdown', async () => {
  //drain will process all claimed entries (the PEL) and stop iteration
  await stream.drain()
})

const lock = new Semaphore(11)
const release = lock.release.bind(lock)
for await (const [streamName, [id, keyvals]] of stream) {
  await lock.acquire()
  tryTask(id, keyvals).finally(release)
}
```
