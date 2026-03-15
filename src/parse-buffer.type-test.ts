import type { ParseBufferFn, RedisStreamOptions } from './types.js'

type Parsed = { field: string }

const parse: ParseBufferFn<Parsed> = (_id, kv) => ({
  field: kv[1].toString(),
})

const options: RedisStreamOptions<Parsed> = {
  streams: ['buffer-stream'],
  buffers: true,
  parse: (id, kv, stream) => parse(id, kv as Buffer[], stream),
}

void options
