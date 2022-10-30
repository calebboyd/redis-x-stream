import { Pipeline } from 'ioredis'
import { RedisStream } from './stream.js'
import mkDebug from 'debug'
import { XBatchResult, XStreamResult } from './types.js'

const debug = mkDebug('redis-x-stream')

//eslint-disable-next-line @typescript-eslint/no-explicit-any
type KindaAny = any

function isNumber(num: number | string | undefined): num is number {
  return typeof num === 'number' && !Number.isNaN(num)
}

export async function readAckDelete(
  stream: RedisStream<KindaAny>
): Promise<IterableIterator<XStreamResult> | undefined> {
  const pipeline = stream.client.pipeline(),
    read = stream.group ? xreadgroup : xread
  xgroup(pipeline, stream)
  ack(pipeline, stream)
  read(pipeline, stream)
  const responses = await pipeline.exec()
  //TODO NOGROUP the consumer group this client was blocked on no longer exists
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

function ack(client: Pipeline, { deleteOnAck, pendingAcks, group }: RedisStream<KindaAny>): void {
  if (!group || !pendingAcks.size) return
  for (const [stream, ids] of pendingAcks) {
    client.xack(stream, group, ...ids)
    if (deleteOnAck) client.xdel(stream, ...ids)
  }
  pendingAcks.clear()
}

function xgroup(client: Pipeline, { group, streams, first }: RedisStream<KindaAny>): void {
  if (!first || !group) return
  for (const [key, start] of streams) {
    debug(`xgroup create ${key} ${group} ${start} mkstream`)
    client.xgroup('create', key, group, start, 'mkstream')
  }
}

function xread(client: any, { block, count, streams, buffers }: RedisStream<KindaAny>): void {
  block = block === Infinity ? 0 : block
  const args = ['COUNT', count, 'STREAMS', ...streams.keys(), ...streams.values()]
  if (isNumber(block)) {
    args.unshift(...['BLOCK', block])
  }
  debug(`xread ${args.join(' ')}`)
  client[buffers ? 'xreadBuffer' : 'xread'](args)
}
function xreadgroup(
  client: any,
  { block, count, group, consumer, noack, streams, buffers }: RedisStream<KindaAny>
): void {
  block = block === Infinity ? 0 : block
  const args = ['COUNT', count.toString()]
  if (noack) args.push('NOACK')
  if (isNumber(block)) {
    args.push('BLOCK', block.toString())
  }
  args.push('STREAMS', ...streams.keys(), ...streams.values())
  debug('xreadgroup' + ` GROUP ${group} ${consumer} ${args.join(' ')}}`)
  //eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  client[buffers ? 'xreadgroupBuffer' : 'xreadgroup']('GROUP', group!, consumer!, ...args)
}
