import { Redis } from 'ioredis'
import { RedisStream } from './redis-x-iterable'
import { StreamEntry, XEntryResult, XStreamResult } from './types'

export async function xread(
  client: Redis,
  { blockMs, count, keys }: { blockMs?: number; count: number; keys: Map<string, string> }
): Promise<XStreamResult[] | null> {
  const block = blockMs === Infinity ? 0 : blockMs,
    args = [
      'COUNT',
      count,
      'STREAMS',
      ...keys.keys(), // streams
      ...keys.values(), // cursors
    ]
  if (typeof block === 'number' && !Number.isNaN(block)) {
    args.unshift(...['BLOCK', block])
  }
  const result = await client.xread(args)
  return (result as unknown) as XStreamResult[]
}

export function xReadIterable(this: RedisStream<'batch'>): AsyncIterator<XStreamResult[], any, undefined> {
  let done = false
  return {
    return: () => this.return(),
    next: async () => {
      if (done) return { done, value: void 0 }
      const streams = await xread(this.client, this)
      if (streams) {
        for (const [name, entries] of streams) {
          this.keys.set(name, entries[entries.length - 1][0])
        }
        return { value: streams, done }
      }
      done = true
      return { done, value: void 0 }
    },
  }
}

export function xReadIterableStream(this: RedisStream<'stream'>): AsyncIterator<XStreamResult, any, undefined> {
  let done = false
  let streamItr: Iterator<XStreamResult> | null | undefined
  return {
    return: () => this.return(),
    next: async () => {
      while (true) {
        if (done) return { done, value: void 0 }
        streamItr = streamItr || (await xread(this.client, this))?.[Symbol.iterator]?.()
        if (!streamItr) return { done: (done = true), value: void 0 }
        const result = streamItr?.next()
        if (result.done) streamItr = null
        else {
          const [streamName, entries] = result.value
          this.keys.set(streamName, entries[entries.length - 1][0])
          return result
        }
      }
    },
  }
}

export function xReadIterableEntries(this: RedisStream<'entry'>): AsyncIterator<XEntryResult> {
  let streamItr: Iterator<XStreamResult> | null | undefined,
    entryItr: Iterator<StreamEntry> | null,
    done = false,
    streamName = ''

  return {
    return: () => this.return(),
    next: async () => {
      while (true) {
        if (done) return { done, value: void 0 }
        streamItr = streamItr || (await xread(this.client, this))?.[Symbol.iterator]()
        if (!streamItr) return { done: (done = true), value: void 0 }
        if (!entryItr) {
          const nextStream = streamItr.next()
          if (!nextStream.done) {
            streamName = nextStream.value[0]
            entryItr = nextStream.value[1][Symbol.iterator]()
          } else streamItr = null
          continue
        }
        const result = entryItr.next()
        if (result.done) entryItr = null
        else {
          this.keys.set(streamName, result.value[0])
          return { done, value: [streamName, result.value] }
        }
      }
    },
  }
}
