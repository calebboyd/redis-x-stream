import { Pipeline } from 'ioredis'
import { RedisStream } from './stream.js'
import { XBatchResult, XStreamResult } from './types.js'

//eslint-disable-next-line @typescript-eslint/no-explicit-any
type KindaAny = any

function isNumber(num: number | string | undefined): num is number {
  return typeof num === 'number' && !Number.isNaN(num)
}

export async function readAckDelete(
  stream: RedisStream<KindaAny>
): Promise<IterableIterator<XStreamResult> | null> {
  const pipeline = stream.client.pipeline(),
    read = stream.group ? xreadgroup : xread
  xgroup(pipeline, stream)
  ack(pipeline, stream)
  read(pipeline, stream)
  const responses = await pipeline.exec()
  for (const result of responses) {
    if (result[0] && !result[0]?.message.startsWith('BUSYGROUP')) {
      throw responses[0]
    }
  }
  const result = responses[responses.length - 1][1] as XBatchResult | null
  if (!result) {
    return null
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
  return null
}

function ack(client: Pipeline, { deleteOnAck, pendingAcks, group }: RedisStream<KindaAny>): void {
  if (!group || !pendingAcks.size) return
  const toAck = [...pendingAcks.entries()]
  pendingAcks.clear()
  for (const [stream, ids] of toAck) {
    client.xack(stream, group, ...ids)
    if (deleteOnAck) client.xdel(stream, ...ids)
  }
}

function xgroup(client: Pipeline, { group, streams, first }: RedisStream<KindaAny>): void {
  if (!first || !group) return
  for (const [key, start] of streams) {
    client.xgroup('create', key, group, start, 'mkstream')
  }
}

function xread(client: Pipeline, { block, count, streams }: RedisStream<KindaAny>): void {
  block = block === Infinity ? 0 : block
  const args = ['COUNT', count, 'STREAMS', ...streams.keys(), ...streams.values()]
  if (isNumber(block)) {
    args.unshift(...['BLOCK', block])
  }
  client.xread(args)
}
function xreadgroup(
  client: Pipeline,
  { block, count, group, consumer, noack, streams }: RedisStream<KindaAny>
): void {
  block = block === Infinity ? 0 : block
  const args = ['COUNT', count.toString()]
  if (noack) args.push('NOACK')
  if (isNumber(block)) {
    args.push('BLOCK', block.toString())
  }
  args.push('STREAMS', ...streams.keys(), ...streams.values())
  //eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  client.xreadgroup('GROUP', group!, consumer!, ...args)
}
