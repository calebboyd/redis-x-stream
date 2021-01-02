import { readAckDelete } from './redis.js'
import { RedisStream } from './stream.js'
import { StreamEntry, XEntryResult, XStreamResult } from './types.js'

export function xReadIterable(
  this: RedisStream<'batch'>
): AsyncIterator<XStreamResult[], void, undefined> {
  return {
    return: () => this.return(),
    next: async () => {
      while (true) {
        if (this.done) return this.return()
        const streamItr = await readAckDelete(this),
          streams = streamItr ? [...streamItr] : null
        if (!streams && !this.first) return this.return()
        if (this.first) {
          this.streams.forEach((v, k) => this.streams.set(k, '>'))
          this.first = false
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
): AsyncIterator<XStreamResult, void, undefined> {
  let streamItr: Iterator<XStreamResult> | null | undefined
  return {
    return: () => this.return(),
    next: async () => {
      while (true) {
        if (this.done) return this.return()
        streamItr = streamItr || (await readAckDelete(this))
        if (!streamItr && !this.first) return this.return()
        if (this.first) {
          this.streams.forEach((v, k) => this.streams.set(k, '>'))
          this.first = false
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
    prev: StreamEntry | void,
    streamName = ''
  return {
    return: () => this.return(),
    next: async () => {
      while (true) {
        if (this.done) return this.return()
        if (prev && this.ackOnIterate) {
          prev = this.ack(streamName, prev[0])
        }
        streamItr = streamItr || (await readAckDelete(this))
        if (!streamItr && !this.first) return this.return()
        if (this.first) {
          this.streams.forEach((v, k) => this.streams.set(k, '>'))
          this.first = false
        }
        if (!streamItr) continue
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
          //for xreadgroup we can track the dispensed id anyway
          //instead of using the '>' cursor
          this.streams.set(streamName, result.value[0])
          if (this.ackOnIterate) prev = result.value
          return { done: this.done, value: [streamName, result.value] }
        }
      }
    },
  }
}
