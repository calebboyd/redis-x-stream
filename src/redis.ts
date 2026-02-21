import Redis, { ChainableCommander, RedisOptions } from 'ioredis'
import { RedisStream } from './stream.js'
import mkDebug from 'debug'
import { XStreamResult, StreamEntry, env, RedisStreamOptions } from './types.js'

const debug = mkDebug('redis-x-stream')

//eslint-disable-next-line @typescript-eslint/no-explicit-any
type KindaAny = any
type IncrementalParameters = KindaAny

function isNumber(num: number | string | undefined): num is number {
  return typeof num === 'number' && !Number.isNaN(num)
}

function* combineResults(
  claimed: XStreamResult[],
  read?: IterableIterator<XStreamResult>,
): IterableIterator<XStreamResult> {
  yield* claimed
  if (read) yield* read
}

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readAckDelete(
  stream: RedisStream<any>,
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

  // Claim idle entries from other consumers.  Skipped on the first read
  // (the PEL read at '0' already covers this consumer's own entries) and
  // when not in group mode.
  const claimKeys =
    stream.claimIdleTime != null && stream.group && !stream.first
      ? xautoclaim(pipeline, stream)
      : []

  read(pipeline, stream)
  const responses = await pipeline.exec()

  if (!responses) {
    return
  }

  // BUSYGROUP is expected when XGROUP CREATE races with another consumer.
  // All other errors (including NOGROUP when a group is deleted externally)
  // are propagated to the caller — the generator's try/finally ensures cleanup.
  for (const result of responses) {
    if (result[0] && !result[0]?.message.startsWith('BUSYGROUP')) {
      throw result[0]
    }
  }

  // Parse XAUTOCLAIM results (positioned before the final XREADGROUP response)
  const claimed: XStreamResult[] = []
  if (claimKeys.length) {
    const claimStart = responses.length - 1 - claimKeys.length
    for (let i = 0; i < claimKeys.length; i++) {
      const [err, res] = responses[claimStart + i]
      if (err) continue
      const [nextCursor, entries] = res as [string, StreamEntry[]]
      stream.claimCursors.set(claimKeys[i], nextCursor)
      if (entries?.length) {
        claimed.push([claimKeys[i], entries])
      }
    }
  }

  // XREADGROUP / XREAD result is always the last pipeline response
  const result = responses[responses.length - 1][1] as XStreamResult[] | null

  // Check if any PEL-draining streams have been fully drained.
  // A stream's PEL is exhausted when it returns 0 entries — switch it to '>'.
  // If PEL had entries they stay in `pelDrainStreams` and the iterator's yield
  // code advances the cursor (by entry ID) so the next read paginates the PEL.
  let transitioned = false
  if (stream.pelDrainStreams?.size) {
    if (result) {
      for (const [streamKey, entries] of result) {
        const key = streamKey.toString()
        if (stream.pelDrainStreams.has(key) && entries.length === 0) {
          stream.streams.set(key, '>')
          stream.pelDrainStreams.delete(key)
          transitioned = true
        }
      }
    } else {
      for (const key of stream.pelDrainStreams) {
        stream.streams.set(key, '>')
      }
      stream.pelDrainStreams.clear()
      transitioned = true
    }
    if (stream.pelDrainStreams.size === 0) {
      stream.pelDrainStreams = null
    }
  }

  // Determine if XREADGROUP produced entries
  let readItr: IterableIterator<XStreamResult> | undefined
  if (result) {
    if (stream.group) {
      for (const s of result) {
        if (s[1].length) {
          readItr = result[Symbol.iterator]()
          break
        }
      }
    } else {
      readItr = result[Symbol.iterator]()
    }
  }

  // Return claimed + read results, or just one, or retry/quit
  if (claimed.length) {
    return combineResults(claimed, readItr)
  }
  if (readItr) {
    return readItr
  }
  if (transitioned) return readAckDelete(stream)
  return
}

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ack(
  client: ChainableCommander,
  { deleteOnAck, pendingAcks, group }: RedisStream<any>,
): void {
  if (!group || !pendingAcks.size) return
  for (const [stream, ids] of pendingAcks) {
    client.xack(stream, group, ...ids)
    if (deleteOnAck) client.xdel(stream, ...ids)
  }
  pendingAcks.clear()
}

//eslint-disable-next-line @typescript-eslint/no-explicit-any
function xgroup(client: ChainableCommander, stream: RedisStream<any>): void {
  const { group, streams, first, addedStreams } = stream
  if (addedStreams) {
    for (const [key, start] of addedStreams) {
      if (group && !first) {
        client.xgroup('CREATE', key, group, start, 'MKSTREAM')
        // Read PEL first ('0'), then transition to '>' once drained.
        // The PEL may contain entries from a pre-existing group (e.g. a
        // consumer in a distributed setup read entries and crashed).
        streams.set(key, '0')
        if (!stream.pelDrainStreams) stream.pelDrainStreams = new Set()
        stream.pelDrainStreams.add(key)
      } else {
        streams.set(key, start)
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

//eslint-disable-next-line @typescript-eslint/no-explicit-any
function xread(
  client: ChainableCommander,
  { block, count, streams, buffers }: RedisStream<any>,
): void {
  block = block === Infinity ? 0 : block
  const args: Parameters<(typeof client)['xread']> = ['COUNT', count] as IncrementalParameters
  if (isNumber(block)) args.unshift('BLOCK', block)
  args.push('STREAMS', ...streams.keys(), ...streams.values())
  debug(`xread ${args.join(' ')}`)
  client[buffers ? 'xreadBuffer' : 'xread'](...args)
}

function xreadgroup(
  client: ChainableCommander,
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  { block, count, first, group, consumer, noack, streams, buffers }: RedisStream<any>,
): void {
  block = block === Infinity ? 0 : block
  const args: Parameters<(typeof client)['xreadgroup']> = [
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

function xautoclaim(
  client: ChainableCommander,
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  { group, consumer, claimIdleTime, count, streams, claimCursors }: RedisStream<any>,
): string[] {
  const keys: string[] = []
  for (const [key] of streams) {
    const cursor = claimCursors.get(key) ?? '0-0'
    debug(`xautoclaim ${key} ${group} ${consumer} ${claimIdleTime} ${cursor} COUNT ${count}`)
    client.xautoclaim(
      key,
      group as string,
      consumer as string,
      claimIdleTime as number,
      cursor,
      'COUNT',
      count,
    )
    keys.push(key)
  }
  return keys
}

export function* initStreams(
  streams: RedisStreamOptions['streams'] | string,
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
