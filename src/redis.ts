import { Pipeline } from 'ioredis'
import { RedisStream } from './stream'
import { XBatchResult } from './types'

export async function readAckDelete(stream: RedisStream<any>): Promise<XBatchResult> {
  const pipeline = stream.client.pipeline(),
    read = stream.group ? xreadgroup : xread
  read(pipeline, stream)
  ack(pipeline, stream)
  const result = await pipeline.exec()
  if (result[0][0] !== null) {
    throw result[0][0]
  }
  return result[0][1]
}

function ack(client: Pipeline, { deleteOnAck, pendingAcks, group }: RedisStream<any>): void {
  if (!group) return
  const toAck = [...pendingAcks.entries()]
  pendingAcks.clear()
  for (const [stream, ids] of toAck) {
    client.xack(stream, group, ...ids)
    if (deleteOnAck) client.xdel(stream, ...ids)
  }
}
function xread(client: Pipeline, { block, count, streams }: RedisStream<any>): void {
  block = block === Infinity ? 0 : block
  const args = ['COUNT', count, 'STREAMS', ...streams.keys(), ...streams.values()]
  if (typeof block === 'number' && !Number.isNaN(block)) {
    args.unshift(...['BLOCK', block])
  }
  client.xread(args)
}
function xreadgroup(
  client: Pipeline,
  { block, count, group, consumer, noack, streams }: RedisStream<any>
): void {
  block = block === Infinity ? 0 : block
  const args = ['COUNT', count.toString()]
  if (noack) args.push('NOACK')
  if (typeof block === 'number' && !Number.isNaN(block)) {
    args.push('BLOCK', block.toString())
  }
  args.push('STREAMS', ...streams.keys(), ...streams.values())
  client.xreadgroup('GROUP', group!, consumer!, ...args)
}
