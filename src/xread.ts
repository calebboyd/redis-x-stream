import { readAckDelete } from './redis'
import { RedisStream } from './stream'
import { StreamEntry, XEntryResult, XStreamResult } from './types'

export function xReadIterable(
  this: RedisStream<'batch'>
): AsyncIterator<XStreamResult[], any, undefined> {
  let first = this.group ? true : false
  return {
    return: () => this.return(),
    next: async () => {
      while (true) {
        if (this.done) return this.return()
        const streams = await readAckDelete(this)
        if (!streams && !first) return this.return()
        if (first) {
          this.streams.forEach((x) => this.streams.set(x, '>'))
          first = false
        }
        if (!streams) continue
        if (!this.group) {
          for (const [name, entries] of streams) {
            this.streams.set(name, entries[entries.length - 1][0])
          }
        }
        return { value: streams, done: this.done }
      }
    },
  }
}

export function xReadIterableStream(
  this: RedisStream<'stream'>
): AsyncIterator<XStreamResult, any, undefined> {
  let streamItr: Iterator<XStreamResult> | null | undefined,
    first = this.group ? true : false
  return {
    return: () => this.return(),
    next: async () => {
      while (true) {
        if (this.done) return this.return()
        streamItr = streamItr || (await readAckDelete(this))?.[Symbol.iterator]?.()
        if (!streamItr && !first) return this.return()
        if (first) {
          this.streams.forEach((x) => this.streams.set(x, '>'))
          first = false
        }
        if (!streamItr) continue
        const result = streamItr?.next()
        if (result.done) streamItr = null
        else {
          const [streamName, entries] = result.value
          this.streams.set(streamName, this.group ? '>' : entries[entries.length - 1][0])
          return result
        }
      }
    },
  }
}

export function xReadIterableEntries(this: RedisStream<'entry'>): AsyncIterator<XEntryResult> {
  let streamItr: Iterator<XStreamResult> | null | undefined,
    entryItr: Iterator<StreamEntry> | null,
    streamName = ''
  return {
    return: () => this.return(),
    next: async () => {
      while (true) {
        if (this.done) return this.return()
        streamItr = streamItr || (await readAckDelete(this))?.[Symbol.iterator]()
        if (!streamItr) return this.return()
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
          this.streams.set(streamName, result.value[0])
          return { done: this.done, value: [streamName, result.value] }
        }
      }
    },
  }
}
