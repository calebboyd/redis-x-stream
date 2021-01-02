import { Redis, RedisOptions } from 'ioredis'

export type StreamEntryId = string
export type StreamKey = string
export type StreamEntryKeyValues = string[]
export type StreamEntry = [StreamEntryId, StreamEntryKeyValues]

//this type is not returned by redis but we're going to use it to dispense entries
export type XEntryResult = [StreamKey, StreamEntry]
//Result Types from iterator
export type XStreamResult = [StreamKey, StreamEntry[]]
export type XBatchResult = XStreamResult[]

export { Redis as RedisClient }

export class RedisStreamAbortedError extends Error {
  message = 'RedisStream Aborted with unprocessed results'
}

export type Mode = 'entry' | 'stream' | 'batch'

export const modes = {
  entry: true,
  stream: true,
  batch: true,
} as const

export const env: { REDIS_X_STREAM_URL?: string } = {}
if (typeof process !== 'undefined' && process.env) {
  env.REDIS_X_STREAM_URL = process.env.REDIS_X_STREAM_URL
}
export interface RedisStreamOptions<T extends Mode> {
  /**
   * 'entry' mode is default and will iterate over each stream entry in each stream in the result set
   * 'stream' mode will iterate over each XREAD[GROUP] stream result
   * 'batch' mode will iterate over each XREAD[GROUP] call result
   */
  mode?: T
  /**
   * Redis stream keys to be read. If a Record is provided each value is the starting id for that stream
   */
  streams: string[] | Record<string, string>
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
   * The IORedis client connection.
   * NOTE: by default this connection becomes a "reader" when block > 0
   */
  redis?: Redis | string | RedisOptions
  /**
   * The maximum number of entries to retrieve in a single read operation
   * "highWaterMark"
   * @default 100
   */
  count?: number
  /**
   * The longest amount of time in milliseconds the dispenser should block
   * while waiting for new entries on any stream
   */
  block?: number
  /**
   * By default, Iterables utilizing consumer groups will
   * automatically queue acknowledgments for previously iterated entries.
   * @default true
   */
  ackOnIterate?: boolean
  /**
   * By default, Iterables utilizing consumer groups will
   * automatically queue acknowledgments for previously iterated entries.
   * @default false
   */
  deleteOnAck?: boolean
  /**
   * NOACK causes redis to bypass the Pending Entries List
   * @default false
   */
  noack?: true
  /**
   * The number of entries to batch ack and remove from the PEL
   * Default behavior or a dispenser is "at least once delivery"
   *
   * The closer the flushPendingAckCount is to 1 the closer you are to achieving "exactly once delivery"
   * At the cost of more frequent redis calls.
   * The higher flushPendingAckCount is - a dispenser failure/recovery could deliver messages more than once from the PEL
   * @default 100
   */
  flushPendingAckCount?: number
  /**
   * If iteration is slow, set this to the maximum amount of time that will elapse before pending acks will be flushed.
   * This counter is reset after each ack
   */
  flushPendingAckInterval?: number
}
