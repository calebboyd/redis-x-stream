import Redis, { ChainableCommander, RedisOptions } from 'ioredis'
import { RedisStream } from './stream.js'
import mkDebug from 'debug'
import { XBatchResult, XStreamResult, env } from './types.js'

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
  const pipeline = stream.client.pipeline(),
    read = stream.group ? xreadgroup : xread
  xgroup(pipeline, stream)
  ack(pipeline, stream)
  read(pipeline, stream)
  const responses = await pipeline.exec()

  if (!responses) {
    return
  }

  //TODO: NOGROUP the consumer group this client was blocked on no longer exists
  for (const result of responses) {
    if (result[0] && !result[0]?.message.startsWith('BUSYGROUP')) {
      throw responses[0]
    }
  }
  const result = responses[responses.length - 1][1] as XBatchResult | null
  if (!result) {
    return
  }
  if (read === xreadgroup) {
    for (const stream of result) {
      if (stream[1].length) {
        return result[Symbol.iterator]()
      }
    }
  } else {
    return result[Symbol.iterator]()
  }
}

function ack(client: ChainableCommander, { deleteOnAck, pendingAcks, group }: RedisStream): void {
  if (!group || !pendingAcks.size) return
  for (const [stream, ids] of pendingAcks) {
    client.xack(stream, group, ...ids)
    if (deleteOnAck) client.xdel(stream, ...ids)
  }
  pendingAcks.clear()
}

function xgroup(client: ChainableCommander, { group, streams, first }: RedisStream): void {
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
  debug(`xread ${args.join(' ')}`)
  client[buffers ? 'xreadBuffer' : 'xread'](
    ...args,
    'STREAMS',
    ...streams.keys(),
    ...streams.values()
  )
}

function xreadgroup(
  client: ChainableCommander,
  { block, count, group, consumer, noack, streams, buffers }: RedisStream
): void {
  block = block === Infinity ? 0 : block
  const args: Parameters<typeof client['xreadgroup']> = [
    'GROUP',
    group as string,
    consumer as string,
    'COUNT',
    count.toString(),
  ] as IncrementalParameters
  if (noack) args.push('NOACK')
  if (isNumber(block)) args.push('BLOCK', block.toString())
  debug(`xreadgroup ${args.join(' ')}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // https://github.com/luin/ioredis/pull/1676#issue-1437398115
  ;(client as any)[buffers ? 'xreadgroupBuffer' : 'xreadgroup'](
    ...args,
    'STREAMS',
    ...streams.keys(),
    ...streams.values()
  )
}

export function createClient(options?: Redis | string | RedisOptions) {
  let client: Redis,
    created = true
  if (typeof options === 'object') {
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
