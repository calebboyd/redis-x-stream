import Redis from 'ioredis'
import { readAckDelete } from './redis.js'
import {
  RedisStreamOptions,
  RedisClient,
  XEntryResult,
  XStreamResult,
  Mode,
  modes,
  env,
} from './types.js'

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
  public buffers?: boolean = false

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
  public first = false

  private itr = {
    name: '',
    prev: undefined as any,
    entry: undefined as any,
    stream: undefined as any,
  }

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

    if (options.buffers) {
      this.buffers = true
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

  async *[Symbol.asyncIterator](): AsyncIterator<
    T extends 'entry' ? XEntryResult : T extends 'batch' ? XStreamResult[] : XStreamResult
  > {
    const itr = this.itr
    while (true) {
      if (this.done) return this.return()
      this.ackPrev()
      itr.stream = itr.stream || (await readAckDelete(this))
      if (!itr.stream && !this.first) return this.return()
      this.moveCursors()
      if (!itr.stream) continue
      if (!itr.entry) {
        const next = itr.stream.next()
        if (!next.done) {
          itr.name = next.value[0].toString()
          itr.entry = next.value[1][Symbol.iterator]()
        } else {
          itr.stream = null
        }
        continue
      }
      const result = itr.entry.next()
      if (result.done) itr.entry = null
      else {
        this.streams.set(itr.name, this.group ? '>' : result.value[0].toString())
        if (this.ackOnIterate) itr.prev = result.value
        yield [itr.name, result.value] as any
      }
    }
  }

  private moveCursors() {
    if (this.first) {
      this.streams.forEach((v, k) => this.streams.set(k, '>'))
      this.first = false
    }
  }

  private ackPrev() {
    if (this.ackOnIterate && this.itr.prev) {
      this.itr.prev = this.ack(this.itr.name, this.itr.prev[0].toString())
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

  protected async return(): Promise<void> {
    await this.quit()
  }
}

export default function createRedisStream<T extends Mode = 'entry'>(
  options: RedisStreamOptions<T> | string,
  ...streams: string[]
): RedisStream<T> {
  return new RedisStream(options, ...streams)
}
