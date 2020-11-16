import { RedisStream } from './redis-x-iterable'
import { XBatchResult, XEntryResult } from './types'

export function xreadgroup(): void {
  void 0
}

export function xReadGroupIterableStream(this: RedisStream<'stream'>): AsyncIterator<XBatchResult> {
  return Promise.resolve() as any
}

export function xReadGroupIterable(this: RedisStream<'batch'>): AsyncIterator<XBatchResult> {
  return Promise.resolve() as any
}

export function xReadGroupIterableEntries(this: RedisStream<'entry'>): AsyncIterator<XEntryResult> {
  return {
    next: async () => {
      return Promise.resolve() as any
    },
  }
}
