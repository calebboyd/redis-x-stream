import Redis from 'ioredis'
import { readAckDelete } from './redis.js'
import {
  RedisStreamOptions,
  RedisClient,
  XEntryResult,
  XStreamResult,
  env,
  StreamEntry,
} from './types.js'

export { RedisStreamOptions }

type ResolvedForCaller = any

export class RedisStream {
  //static factoryFor() { //create factory that extends options }
  /**
   * 'entry' mode will dispense each entry of each stream
   * 'stream' mode will dispense each stream containing entries
   * 'batch' mode will dispense all streams with all entries
   */
  public readonly client: RedisClient
  public readonly group?: string
  public readonly consumer?: string

  //xread options
  public streams: Map<string, string>
  public count = 100
  public noack = false
  public block?: number
  public buffers = false

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
    prev: undefined as StreamEntry | undefined,
    entry: null as IterableIterator<StreamEntry> | null,
    stream: null as IterableIterator<XStreamResult> | null | undefined,
  }

  /**
   * Did we create the redis connection?
   */
  private createdConnection = true

  constructor(options: RedisStreamOptions | string, ...streams: string[]) {
    if (typeof options === 'string') {
      streams.unshift(options)
      options = { streams }
    }
    if (typeof options.redis === 'object') {
      if ('pipeline' in options.redis) {
        this.client = options.redis
        this.createdConnection = false
      } else {
        this.client = new Redis({ ...options.redis })
      }
    } else if (typeof options.redis === 'string') {
      this.client = new Redis(options.redis)
    } else if (env.REDIS_X_STREAM_URL) {
      this.client = new Redis(env.REDIS_X_STREAM_URL)
    } else {
      this.client = new Redis()
    }

    if (options.consumer || options.group) {
      if (!options.group) {
        this.group = '_xs_g_' + options.consumer
      }
      if (!options.consumer) {
        this.consumer = '_xs_c_' + options.group
      }
      this.group = this.group ?? options.group
      this.consumer = this.consumer ?? options.consumer
      this.first = true
    }

    if (Array.isArray(options.streams)) {
      this.streams = options.streams.reduce((keys, key) => {
        return keys.set(key, '0')
      }, new Map<string, string>())
    } else {
      this.streams = new Map(Object.entries(options.streams))
    }

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

  async *[Symbol.asyncIterator](): AsyncIterator<XEntryResult> {
    const itr = this.itr
    while (true) {
      if (this.done) {
        return this.quit()
      }
      if (this.ackOnIterate && this.itr.prev) {
        this.itr.prev = this.ack(this.itr.name, this.itr.prev[0].toString())
      }
      if (!itr.stream) {
        itr.stream = await readAckDelete(this)
      }
      if (!itr.stream && !this.first) {
        return this.quit()
      }
      if (this.first) {
        for (const [stream] of this.streams) {
          this.streams.set(stream, '>')
        }
        this.first = false
      }
      if (!itr.stream) {
        continue
      }
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
      if (result.done) {
        itr.entry = null
      } else {
        this.streams.set(itr.name, this.group ? '>' : result.value[0].toString())
        if (this.ackOnIterate) itr.prev = result.value
        const ret: XEntryResult = [itr.name, result.value]
        yield ret as ResolvedForCaller
      }
    }
  }

  public async quit(): Promise<void> {
    if (!this.done) {
      this.done = true
      if (!this.createdConnection) return
      await Promise.all([
        new Promise((resolve) => this.client.once('end', resolve)),
        this.client.quit(),
      ])
    }
  }

  public ack(stream: string, ...ids: string[]): undefined {
    if (!this.group) {
      throw new Error('Cannot ack entries read outside of a consumer group')
    }
    const acks = this.pendingAcks.get(stream) || []
    acks.push(...ids)
    this.pendingAcks.set(stream, acks)
    return
  }

  protected async return(): Promise<void> {
    await this.quit()
  }
}

export default function createRedisStream(
  options: RedisStreamOptions | string,
  ...streams: string[]
): RedisStream {
  return new RedisStream(options, ...streams)
}
