import { Redis, RedisOptions } from 'ioredis'

export type StreamEntryId = string
export type StreamKey = string
export type StreamEntryKeyValues = string[]
export type StreamEntry = [StreamEntryId, StreamEntryKeyValues]

//this type is not returned by redis but we're going to use it to dispense entries
export type XEntryResult = [StreamKey, StreamEntry]
//Result Types from iterator
export type XStreamResult = [StreamKey, StreamEntry[]]

//Buffers
export type StreamEntryKeyValueBuffers = Buffer[]
export type XEntryBufferResult = [StreamKey, StreamEntryKeyValueBuffers]
export type XStreamResultBuffer = [StreamKey, StreamEntryKeyValueBuffers[]]
export type XBatchResultBuffer = XStreamResult[]

export type RedisClient = Redis
export { RedisOptions }

export class RedisStreamAbortedError extends Error {
  message = 'RedisStream Aborted with unprocessed results'
}

// ---- XINFO / XPENDING result types ----

export interface StreamInfo {
  length: number
  radixTreeKeys: number
  radixTreeNodes: number
  lastGeneratedId: string
  maxDeletedEntryId: string
  entriesAdded: number
  recordedFirstEntryId: string
  groups: number
  firstEntry: StreamEntry | null
  lastEntry: StreamEntry | null
}

export interface GroupInfo {
  name: string
  consumers: number
  pending: number
  lastDeliveredId: string
  entriesRead: number | null
  lag: number | null
}

export interface ConsumerInfo {
  name: string
  pending: number
  idle: number
  inactive: number
}

export interface PendingSummary {
  count: number
  minId: string | null
  maxId: string | null
  consumers: { name: string; count: number }[]
}

// ---- Event types ----

export interface RedisStreamEvents {
  error: (error: Error) => void
  ready: () => void
  close: () => void
  reconnecting: () => void
}

export const env: { REDIS_X_STREAM_URL?: string } = {}
if (typeof process !== 'undefined' && process.env) {
  env.REDIS_X_STREAM_URL = process.env.REDIS_X_STREAM_URL
}
export type ParseFn<T> = (id: StreamEntryId, kv: StreamEntryKeyValues, stream: StreamKey) => T
/**
 * Parse function variant for use with `buffers: true`.
 * When buffer mode is enabled the raw key-value array contains Buffers
 * instead of strings.  Use this type when writing a standalone parse
 * function that only handles buffer mode.
 */
export type ParseBufferFn<T> = (id: StreamEntryId, kv: Buffer[], stream: StreamKey) => T

export interface RedisStreamOptions<T = StreamEntryKeyValues> {
  /**
   * Redis stream keys to be read. If a Record is provided each value is the starting id for that stream
   *
   *  *alias* for stream
   */
  streams?: string[] | Record<string, string> | string
  /**
   * Redis stream keys to be read. If a Record is provided each value is the starting id for that stream
   */
  stream?: string[] | Record<string, string> | string
  /**
   * The consumer group.
   * Note: if only a group is provided a consumer is created automatically
   */
  group?: string
  /**
   * The consumer.
   * Note: if only consumer is provided, a group is created automatically
   */
  consumer?: string
  /**
   * The IORedis client connection (reader).
   * NOTE: by default this connection becomes a "reader" when block > 0
   */
  redis?: RedisClient | string | RedisOptions
  /**
   * The IORedis control client connection (writer).
   * NOTE: by default this connection becomes a "writer" when block = 0 or Infinity
   * Only allowed if block = 0 or Infinity
   */
  redisControl?: RedisClient | string | RedisOptions
  /**
   * Return buffers with each xread operation
   * This applies to entry id and kv results
   */
  buffers?: boolean
  /**
   * The maximum number of entries to retrieve in a single read operation
   * eg. the "highWaterMark"
   * @default 100
   */
  count?: number
  /**
   * The longest amount of time in milliseconds the dispenser should block
   * while waiting for new entries on any stream, passed to xread or xreadgroup
   */
  block?: number
  /**
   * If set to `true` Iterables utilizing consumer groups will
   * automatically queue acknowledgments for previously iterated entries.
   * @default false
   */
  ackOnIterate?: boolean
  /**
   * If set to `true` Iterables utilizing consumer groups will
   * automatically delete entries after acknowledgment
   * @default false
   */
  deleteOnAck?: boolean
  /**
   * Pass the NOACK flag to calls to xreadgroup bypassing the Redis PEL
   * @default false
   */
  noack?: boolean
  /**
   * Maximum time in milliseconds between an ack being queued and it being
   * flushed to Redis.  The timer resets after each call to `ack()`.
   * Useful when the consumer is slow or the reader is blocked — acks are
   * flushed even if the next `readAckDelete` pipeline hasn't run yet.
   *
   * Set to `null` (default) to disable the timer.
   */
  flushPendingAckInterval?: number | null
  /**
   * Minimum idle time in milliseconds for pending entries to be claimed
   * from other consumers via XAUTOCLAIM.  Requires Redis >= 6.2.
   * Enables dead consumer recovery — entries abandoned by crashed consumers
   * are automatically claimed and re-delivered through the iterator.
   *
   * Disabled by default (no claiming).
   */
  claimIdleTime?: number
  /**
   * Transform each entry's raw key-value array before yielding.
   * Receives the entry ID, the flat `[k1, v1, k2, v2, ...]` array,
   * and the stream name.  The return value becomes the entry payload
   * in the iterator output: `[streamName, [entryId, T]]`.
   *
   * When omitted the raw `string[]` is yielded unchanged.
   */
  parse?: ParseFn<T>
}
