import Redis from 'ioredis'
import { Mode } from './mode'
import { XIterableOptions, RedisClient, XEntryResult, XStreamResult } from './types'
import { xReadGroupIterableEntries, xReadGroupIterable, xReadGroupIterableStream } from './xreadgroup'
import { xReadIterableStream, xReadIterableEntries, xReadIterable } from './xread'

type StreamKeys = { [stream: string]: string[] }

export class RedisStream<T extends Mode = 'entry'> {
  /**
   * Using entry mode will dispense each entry of each stream
   * Using stream mode will dispense each stream containing entries
   * Using batch mode will dispense all streams with all entries
   */
  public readonly mode: Mode = 'entry'
  public readonly group: string | undefined
  public readonly consumer: string | undefined
  public readonly blockMs?: number
  public readonly count = 100
  public readonly keys: Map<string, string>
  public readonly client: RedisClient

  constructor(options: XIterableOptions<T> | string, ...streams: string[]) {
    if (typeof options === 'string') {
      streams.push(options)
      options = { redis: new Redis(), keys: streams }
    }
    if (options.mode) {
      this.mode = options.mode
    }
    this.client = options.redis || new Redis()

    if (Array.isArray(options.keys)) {
      this.keys = options.keys.reduce((keys, key) => {
        return keys.set(key, '0')
      }, new Map<string, string>())
    } else {
      this.keys = new Map(Object.entries(options.keys))
    }

    if (options.consumer || options.group) {
      if (!options.group) {
        this.group = '_x_iter_g_' + options.consumer
      }
      if (!options.consumer) {
        this.consumer = '_x_iter_c_' + options.group
      }
    }
  }

  //https://github.com/Microsoft/TypeScript/issues/13995
  [Symbol.asyncIterator](): AsyncIterator<
    T extends 'entry' ? XEntryResult : T extends 'batch' ? XStreamResult[] : XStreamResult
  > {
    if (this.mode === 'batch') {
      if (this.group) {
        return xReadGroupIterable.call(this as RedisStream<'batch'>) as any
      }
      return xReadIterable.call(this as RedisStream<'batch'>) as any
    }
    if (this.mode === 'stream') {
      if (this.group) {
        return xReadGroupIterableStream.call(this as RedisStream<'stream'>) as any
      }
      return xReadIterableStream.call(this as RedisStream<'stream'>) as any
    }
    if (this.group) {
      return xReadGroupIterableEntries.call(this as RedisStream<'entry'>) as any
    }
    return xReadIterableEntries.call(this as RedisStream<'entry'>) as any
  }

  async return(): Promise<IteratorReturnResult<void>> {
    await this.client.quit()
    this.client.disconnect()
    //TODO cleanup client
    return Promise.resolve({ done: true, value: void 0 })
  }

  ack({ keys, xdel }: { keys: StreamKeys; xdel?: StreamKeys }): Promise<string[]> {
    if (!this.group) {
      throw new Error('Cannot ack entries read outside of a consumer group')
    }
    return Promise.resolve(void 0 as any)
  }

  del({ keys, xack }: { keys: StreamKeys; xack?: StreamKeys }): Promise<string[]> {
    if (xack?.length && !this.group) {
      throw new Error('Cannot ack entries read outside of a consumer group')
    }
    return Promise.resolve(void 0 as any)
  }
}
