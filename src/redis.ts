import Redis, { ChainableCommander, RedisOptions } from 'ioredis'
import { RedisStream } from './stream.js'
import mkDebug from 'debug'
import { XStreamResult, env, RedisStreamOptions } from './types.js'

const debug = mkDebug('redis-x-stream')

//eslint-disable-next-line @typescript-eslint/no-explicit-any
type KindaAny = any
type IncrementalParameters = KindaAny

function isNumber(num: number | string | undefined): num is number {
  return typeof num === 'number' && !Number.isNaN(num)
}

export async function readAckDelete(
  stream: RedisStream
): Promise<IterableIterator<XStreamResult> | undefined> {
  const pipeline = stream.client.pipeline()

  if (stream.draining) {
    ack(pipeline, stream)
    await pipeline.exec()
    return
  }

  const read = stream.group ? xreadgroup : xread
  xgroup(pipeline, stream)
  ack(pipeline, stream)
  read(pipeline, stream)
  const responses = await pipeline.exec()

  if (!responses) {
    return
  }

  //TODO: FATAL - NOGROUP the consumer group this client was blocked on no longer exists
  for (const result of responses) {
    if (result[0] && !result[0]?.message.startsWith('BUSYGROUP')) {
      throw responses[0]
    }
  }
  const result = responses[responses.length - 1][1] as XStreamResult[] | null
  if (!result) {
    return
  }
  if (stream.group) {
    for (const stream of result) {
      if (stream[1].length) {
        return result[Symbol.iterator]()
      }
    }
  } else {
    return result[Symbol.iterator]()
  }
}

export function ack(
  client: ChainableCommander,
  { deleteOnAck, pendingAcks, group }: RedisStream
): void {
  if (!group || !pendingAcks.size) return
  for (const [stream, ids] of pendingAcks) {
    client.xack(stream, group, ...ids)
    if (deleteOnAck) client.xdel(stream, ...ids)
  }
  pendingAcks.clear()
}

function xgroup(client: ChainableCommander, stream: RedisStream): void {
  const { group, streams, first, addedStreams } = stream
  if (addedStreams) {
    for (const [key, start] of addedStreams) {
      streams.set(key, start)
      if (group && !first) {
        client.xgroup('CREATE', key, group, start, 'MKSTREAM')
      }
    }
    stream.addedStreams = null
  }
  if (!first || !group) return
  for (const [key, start] of streams) {
    debug(`xgroup create ${key} ${group} ${start} mkstream`)
    client.xgroup('CREATE', key, group, start, 'MKSTREAM')
  }
}

function xread(client: ChainableCommander, { block, count, streams, buffers }: RedisStream): void {
  block = block === Infinity ? 0 : block
  const args: Parameters<typeof client['xread']> = ['COUNT', count] as IncrementalParameters
  if (isNumber(block)) args.unshift('BLOCK', block)
  args.push('STREAMS', ...streams.keys(), ...streams.values())
  debug(`xread ${args.join(' ')}`)
  client[buffers ? 'xreadBuffer' : 'xread'](...args)
}

function xreadgroup(
  client: ChainableCommander,
  { block, count, first, group, consumer, noack, streams, buffers }: RedisStream
): void {
  block = block === Infinity ? 0 : block
  const args: Parameters<typeof client['xreadgroup']> = [
    'GROUP',
    group as string,
    consumer as string,
  ] as IncrementalParameters
  if (!first) args.push('COUNT', count.toString())
  if (noack) args.push('NOACK')
  if (isNumber(block)) args.push('BLOCK', block.toString())
  args.push('STREAMS', ...streams.keys(), ...streams.values())
  debug(`xreadgroup ${args.join(' ')}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // https://github.com/luin/ioredis/pull/1676#issue-1437398115
  ;(client as KindaAny)[buffers ? 'xreadgroupBuffer' : 'xreadgroup'](...args)
}

export function* initStreams(
  streams: RedisStreamOptions['streams'] | string
): Iterable<[string, string]> {
  if (typeof streams === 'string') streams = [streams]
  if (Array.isArray(streams)) {
    for (const stream of streams) {
      yield [stream, '0']
    }
  } else if (streams) {
    yield* Object.entries(streams)
  } else {
    return
  }
}

export function createClient(options?: Redis | string | RedisOptions) {
  let client: Redis,
    created = true
  if (options && typeof options === 'object') {
    if ('pipeline' in options) {
      client = options
      created = false
    } else {
      client = new Redis({ ...options })
    }
  } else if (typeof options === 'string') {
    client = new Redis(options)
  } else if (env.REDIS_X_STREAM_URL) {
    client = new Redis(env.REDIS_X_STREAM_URL)
  } else {
    client = new Redis()
  }
  return { client, created }
}
