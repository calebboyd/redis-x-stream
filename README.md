```
Work in progress 🚧👷‍♂️🔨
```
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
## TODO
- [ ] xreadgroup
- [ ] ack
- [ ] del
- [ ] eager load?
