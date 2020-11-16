```
Work in progress 🚧👷‍♂️🔨
```

# redis-x-iterable

An Async Iterable Interface for redis streams.

```javascript
import { RedisStream } from 'redis-x-iterable'

for await (const [id, keyVal] of new RedisStream('myStream')) {

}
```
Additional options can utilize XREADGROUP
```javascript

const stream = new RedisStream({  
  keys: {
    'my-stream': ">"
  },
  group: 'mygroup',
  consumer: 'myconsumer',
  count: 100,
  blockMs: Infinity,
  
  redis: redisClient,
})
```