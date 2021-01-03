import Redis from 'ioredis'
import {
  RedisStreamOptions,
  RedisClient,
  XEntryResult,
  XStreamResult,
  Mode,
  modes,
  env,
} from './types.js'
import { xReadIterableStream, xReadIterableEntries, xReadIterable } from './xread.js'

//https://github.com/Microsoft/TypeScript/issues/13995
type NotNarrowable = any //eslint-disable-line @typescript-eslint/no-explicit-any

export { RedisStreamOptions, Mode }

export class RedisStream<T extends Mode = 'entry'> {
  //static factoryFor() { //create factory that extends options }
  /**
   * 'entry' mode will dispense each entry of each stream
   * 'stream' mode will dispense each stream containing entries
   * 'batch' mode will dispense all streams with all entries
   */
  public readonly mode: Mode = 'entry'
  public readonly client: RedisClient
  public readonly group?: string
  public readonly consumer?: string

  //xread options
  public streams: Map<string, string>
  public count = 100
  public noack = false
  public block?: number

  //behavior
  public ackOnIterate = false
  public deleteOnAck = false

  //state
  /**
   * Acks waiting to be sent on either:
   * - timeout
   * - async iteration
   */
  public pendingAcks = new Map<string, string[]>()
  /**
   * Flag for iterable state
   */
  public done = false
  /**
   * Flag for first iteration
   */
  public first = false
  /**
   * Did we create the redis connection?
   */
  private createdConnection = true

  constructor(options: RedisStreamOptions<T> | string, ...streams: string[]) {
    if (typeof options === 'string') {
      streams.unshift(options)
      options = { streams }
    }
    const mode = options.mode ?? 'entry'
    if (!modes[mode]) {
      throw new TypeError(
        `"${options.mode}" is not a valid Mode - use one of:  'entry' | 'batch' | 'stream'`
      )
    }
    this.mode = mode

    if (typeof options.redis === 'object') {
      if ('pipeline' in options.redis) {
        this.client = options.redis
        this.createdConnection = false
      } else this.client = new Redis({ ...options.redis })
    } else if (typeof options.redis === 'string') this.client = new Redis(options.redis)
    else if (env.REDIS_X_STREAM_URL) this.client = new Redis(env.REDIS_X_STREAM_URL)
    else this.client = new Redis()

    if (options.consumer || options.group) {
      if (!options.group) this.group = '_xs_g_' + options.consumer
      if (!options.consumer) this.consumer = '_xs_c_' + options.group
      this.group = this.group ?? options.group
      this.consumer = this.consumer ?? options.consumer
      this.first = true
    }

    if (Array.isArray(options.streams))
      this.streams = options.streams.reduce((keys, key) => {
        return keys.set(key, '0')
      }, new Map<string, string>())
    else this.streams = new Map(Object.entries(options.streams))

    if (typeof options.count === 'number') {
      this.count = options.count
    }

    if (options.noack) {
      this.noack = true
    }

    if (typeof options.block === 'number' && !Number.isNaN(options.block)) {
      this.block = options.block
    }

    if (options.deleteOnAck) {
      this.deleteOnAck = true
    }

    if (options.ackOnIterate) {
      this.ackOnIterate = true
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<
    T extends 'entry' ? XEntryResult : T extends 'batch' ? XStreamResult[] : XStreamResult
  > {
    //Typing works for the consumer but requires casting here...
    switch (this.mode) {
      case 'batch':
        return xReadIterable.call(this as RedisStream<'batch'>) as NotNarrowable
      case 'entry':
        return xReadIterableEntries.call(this as RedisStream<'entry'>) as NotNarrowable
      case 'stream':
        return xReadIterableStream.call(this as RedisStream<'stream'>) as NotNarrowable
    }
  }

  public async quit(): Promise<void> {
    if (!this.done) {
      this.done = true
      this.createdConnection &&
        (await Promise.all([
          new Promise((resolve) => this.client.once('end', resolve)),
          this.client.quit(),
        ]))
    }
  }

  public ack(stream: string, ...ids: string[]): void {
    if (!this.group) {
      throw new Error('Cannot ack entries read outside of a consumer group')
    }
    const acks = this.pendingAcks.get(stream) || []
    acks.push(...ids)
    this.pendingAcks.set(stream, acks)
  }

  protected async return(): Promise<IteratorReturnResult<void>> {
    await this.quit()
    return { done: true, value: void 0 }
  }
}

export default RedisStream
