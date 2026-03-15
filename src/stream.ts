import { hostname } from 'os'
import { EventEmitter } from 'events'
import { ack, closeClient, createClient, initStreams, readAckDelete } from './redis.js'
import type {
  RedisStreamOptions,
  RedisClient,
  RedisStreamEvents,
  StreamEntryId,
  StreamEntryKeyValues,
  StreamKey,
  XStreamResult,
  StreamEntry,
  StreamInfo,
  GroupInfo,
  ConsumerInfo,
  PendingSummary,
} from './types.js'

type ParseAnyFn<T> = (
  id: StreamEntryId,
  kv: StreamEntryKeyValues | Buffer[],
  stream: StreamKey,
) => T

export {
  RedisStreamOptions,
  RedisClient,
  RedisOptions,
  ParseFn,
  ParseBufferFn,
  StreamInfo,
  GroupInfo,
  ConsumerInfo,
  PendingSummary,
  RedisStreamEvents,
} from './types.js'

//eslint-disable-next-line @typescript-eslint/no-explicit-any
function kvToObject<T>(arr: any[]): T {
  const obj: Record<string, unknown> = {}
  for (let i = 0; i < arr.length; i += 2) {
    const key = String(arr[i]).replace(/-/g, '_')
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    obj[camel] = arr[i + 1]
  }
  return obj as T
}

const allowedKeys = {
  stream: 1,
  streams: 1,
  group: 1,
  consumer: 1,
  redis: 1,
  buffers: 1,
  count: 1,
  block: 1,
  ackOnIterate: 1,
  deleteOnAck: 1,
  noack: 1,
  flushPendingAckInterval: 1,
  claimIdleTime: 1,
  parse: 1,
  redisControl: 1,
}
const hasOwn = {}.hasOwnProperty

export class RedisStream<T = StreamEntryKeyValues> extends EventEmitter {
  public readonly client: RedisClient
  public readonly control?: RedisClient
  public readonly group?: string
  public readonly consumer?: string
  public readonly blocked: boolean = false

  //xread options
  public streams: Map<string, string>
  public count = 100
  public noack = false
  public block?: number
  public buffers = false

  //behavior
  public ackOnIterate = false
  public deleteOnAck = false
  public flushPendingAckInterval: number | null = null
  public claimIdleTime: number | null = null
  private parseFn?: ParseAnyFn<T>

  //state
  /**
   * Acks waiting to be sent on either:
   * - interval
   * - async iteration
   */
  public pendingAcks = new Map<string, string[]>()
  /**
   * Flag for iterable state
   */
  public done = false
  public first = false
  public draining = false
  public reading = false
  public addedStreams: null | Iterable<[string, string]> = null
  public pelDrainStreams: Set<string> | null = null
  public claimCursors = new Map<string, string>()
  private unblocked = false
  private flushTimer: ReturnType<typeof setTimeout> | null = null

  private readerId: number | null = null
  private pendingId: Promise<number | null> | null = null

  private itr = {
    name: '',
    prev: undefined as StreamEntry | undefined,
    entry: null as IterableIterator<StreamEntry> | null,
    stream: null as IterableIterator<XStreamResult> | null | undefined,
  }

  /**
   * Did we create the redis connection?
   */
  private createdConnection = false
  /**
   * Did we create the control redis connection?
   */
  private createdControlConnection = false

  private emitError(error: Error): void {
    if (this.listenerCount('error') > 0) {
      this.emit('error', error)
    }
  }

  constructor(options: RedisStreamOptions<T> | string, ...streams: string[]) {
    super()
    if (typeof options === 'string') {
      streams.unshift(options)
      options = { streams }
    } else {
      const extraneousOpts = Object.keys(options).filter((opt) => !hasOwn.call(allowedKeys, opt))
      if (extraneousOpts.length) {
        throw new TypeError(`Unexpected option(s): ${JSON.stringify(extraneousOpts).slice(1, -1)}`)
      }
    }

    if (typeof options.block === 'number' && !Number.isNaN(options.block)) {
      this.block = options.block
    }

    this.streams = new Map([
      ...initStreams(streams),
      ...initStreams(options.streams),
      ...initStreams(options.stream),
    ])

    if (this.streams.size === 0) {
      throw new TypeError('At least one stream key is required')
    }

    if (this.block === 0 || this.block === Infinity) {
      this.blocked = true
      const { client, created } = createClient(options.redisControl)
      this.control = client
      this.createdControlConnection = created
    } else if (options.redisControl) {
      throw new Error(
        'redisControl options are only needed in blocking mode: `block: Infinity` | `block: 0`',
      )
    }

    const { created, client } = createClient(options.redis)
    this.createdConnection = created
    this.client = client

    // Forward ioredis connection events so consumers can observe
    // connection health without accessing the underlying client.
    this.client.on('error', (err: Error) => this.emitError(err))
    this.client.on('ready', () => this.emit('ready'))
    this.client.on('close', () => this.emit('close'))
    this.client.on('reconnecting', () => this.emit('reconnecting'))

    if (this.control && this.control !== this.client) {
      this.control.on('error', (err: Error) => this.emitError(err))
    }

    if (this.blocked) {
      this.pendingId = this.client.client('ID').then(
        (id) => (this.readerId = id),
        () => (this.pendingId = this.readerId = null),
      )
    }

    if (options.consumer || options.group) {
      if (!options.group) {
        this.group = '_xs_g_' + options.consumer
      }
      if (!options.consumer) {
        this.consumer = '_xs_c_' + options.group + '_' + hostname()
      }
      this.group = this.group ?? options.group
      this.consumer = this.consumer ?? options.consumer
      this.first = true
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

    if (options.deleteOnAck) {
      this.deleteOnAck = true
    }

    if (options.ackOnIterate) {
      this.ackOnIterate = true
    }

    if (typeof options.flushPendingAckInterval === 'number') {
      this.flushPendingAckInterval = options.flushPendingAckInterval
    }

    if (typeof options.claimIdleTime === 'number') {
      this.claimIdleTime = options.claimIdleTime
    }

    if (options.parse) {
      this.parseFn = options.parse as ParseAnyFn<T>
    }
  }

  // ---- Observability methods (XINFO / XPENDING wrappers) ----

  /**
   * Returns stream metadata via XINFO STREAM for each configured stream.
   */
  public async info(): Promise<Map<string, StreamInfo>> {
    const c = this.control ?? this.client
    const out = new Map<string, StreamInfo>()
    for (const [key] of this.streams) {
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = (await c.xinfo('STREAM', key)) as any[]
      out.set(key, kvToObject<StreamInfo>(raw))
    }
    return out
  }

  /**
   * Returns consumer group information via XINFO GROUPS for the given stream
   * (or the first configured stream if omitted).
   */
  public async groups(stream?: string): Promise<GroupInfo[]> {
    const key = stream ?? [...this.streams.keys()][0]
    const c = this.control ?? this.client
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (await c.xinfo('GROUPS', key)) as any[][]
    return raw.map((g) => kvToObject<GroupInfo>(g))
  }

  /**
   * Returns consumer information via XINFO CONSUMERS for the configured
   * group on the given stream (or the first configured stream if omitted).
   */
  public async consumers(stream?: string): Promise<ConsumerInfo[]> {
    if (!this.group) throw new Error('consumers() requires a consumer group')
    const key = stream ?? [...this.streams.keys()][0]
    const c = this.control ?? this.client
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (await c.xinfo('CONSUMERS', key, this.group)) as any[][]
    return raw.map((g) => kvToObject<ConsumerInfo>(g))
  }

  /**
   * Returns the XPENDING summary for the configured group on the given
   * stream (or the first configured stream if omitted).
   */
  public async pending(stream?: string): Promise<PendingSummary> {
    if (!this.group) throw new Error('pending() requires a consumer group')
    const key = stream ?? [...this.streams.keys()][0]
    const c = this.control ?? this.client
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (await c.xpending(key, this.group)) as any[]
    return {
      count: raw[0] as number,
      minId: raw[1] as string | null,
      maxId: raw[2] as string | null,
      consumers: ((raw[3] as [string, string][] | null) ?? []).map(([name, count]) => ({
        name,
        count: Number(count),
      })),
    }
  }

  // ---- Type-safe event emitter overrides ----

  public override on<K extends keyof RedisStreamEvents>(
    event: K,
    listener: RedisStreamEvents[K],
  ): this {
    return super.on(event, listener)
  }

  public override emit<K extends keyof RedisStreamEvents>(
    event: K,
    ...args: Parameters<RedisStreamEvents[K]>
  ): boolean {
    return super.emit(event, ...args)
  }

  async *[Symbol.asyncIterator](): AsyncIterator<[StreamKey, [StreamEntryId, T]]> {
    const itr = this.itr
    try {
      while (true) {
        if (this.done) {
          return
        }
        if (this.ackOnIterate && this.itr.prev) {
          this.itr.prev = this.ack(this.itr.name, this.itr.prev[0].toString())
        }
        if (!itr.stream) {
          this.reading = true
          itr.stream = await readAckDelete(this)
          this.reading = false
        }
        if (!itr.stream && !this.first) {
          if (this.unblocked) {
            this.unblocked = false
            continue
          }
          return
        }
        if (this.first) {
          // Cleared here as a defensive fallback; the normal path
          // clears `first` inside readAckDelete after setting up
          // pelDrainStreams for PEL pagination.
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
          const pelDrain = this.pelDrainStreams?.has(itr.name)
          this.streams.set(itr.name, this.group && !pelDrain ? '>' : result.value[0].toString())
          if (this.ackOnIterate) itr.prev = result.value
          const entry: [StreamEntryId, T] = this.parseFn
            ? [result.value[0], this.parseFn(result.value[0].toString(), result.value[1], itr.name)]
            : (result.value as unknown as [StreamEntryId, T])
          yield [itr.name, entry]
        }
      }
    } finally {
      await this.quit()
    }
  }

  public async quit(): Promise<void> {
    if (!this.done) {
      this.done = true
      this.clearFlushTimer()
      // Flush the last ackOnIterate entry that would normally be acked at
      // the top of the next iteration.  When quit() is called externally or
      // the generator exits via break, that iteration never runs.
      if (this.ackOnIterate && this.itr.prev) {
        this.ack(this.itr.name, this.itr.prev[0].toString())
        this.itr.prev = undefined
      }
      if (this.pendingAcks.size || this.readerId) {
        const pipeline = (this.control ? this.control : this.client).pipeline()
        if (this.pendingAcks.size) {
          ack(pipeline, this)
        }
        if (this.readerId) {
          pipeline.client('UNBLOCK', this.readerId)
        }
        await pipeline.exec()
      }
      if (!(this.createdConnection || this.createdControlConnection)) return
      await Promise.all([
        this.createdConnection ? closeClient(this.client) : undefined,
        this.createdControlConnection ? closeClient(this.control) : undefined,
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
    this.resetFlushTimer()
    return
  }

  private resetFlushTimer() {
    if (this.flushPendingAckInterval == null) return
    this.clearFlushTimer()
    const timer = setTimeout(() => {
      this.flushTimer = null
      if (this.pendingAcks.size && !this.done) {
        this.flush().catch(() => {})
      }
    }, this.flushPendingAckInterval)
    timer.unref()
    this.flushTimer = timer
  }

  private clearFlushTimer() {
    if (this.flushTimer != null) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
  }

  private async maybeUnblock() {
    if (this.reading && !this.done) {
      if (typeof this.readerId !== 'number') {
        await this.pendingId
        this.pendingId = null
      }
      if (typeof this.readerId !== 'number') {
        throw new Error('Unable to read client id')
      }
      this.unblocked = true
      await this.control?.client('UNBLOCK', this.readerId)
    }
  }

  public async addStream(streams: RedisStreamOptions['streams'] | string) {
    this.addedStreams = this.addedStreams
      ? [...this.addedStreams, ...initStreams(streams)]
      : initStreams(streams)
    await this.maybeUnblock()
  }

  /**
   * Iterate through remaining items in the PEL and exit
   */
  public async drain() {
    this.draining = true
    await this.maybeUnblock()
  }

  /**
   * Flush any acknowledgements that were added potentially after the stream finished.
   * @param client
   * @returns
   */
  public async flush(client?: RedisClient) {
    if (!this.pendingAcks.size) return
    let c = client
    if (!this.done) {
      c = c ?? (this.control ? this.control : this.client)
    }
    if (this.done && !this.createdConnection) {
      c = c ?? this.client
    }
    if (!c) throw new Error('No suitable client')
    const pipeline = c.pipeline()
    ack(pipeline, this)
    const results = await pipeline.exec()
    if (results) {
      for (const [err] of results) {
        if (err) throw err
      }
    }
  }
}

export default function createRedisStream<T = StreamEntryKeyValues>(
  options: RedisStreamOptions<T> | string,
  ...streams: string[]
): RedisStream<T> {
  return new RedisStream<T>(options, ...streams)
}
