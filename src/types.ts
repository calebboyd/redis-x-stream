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

//Buffers
export type StreamEntryKeyValueBuffers = Buffer[]
export type XEntryBufferResult = [StreamKey, StreamEntryKeyValueBuffers]
export type XStreamResultBuffer = [StreamKey, StreamEntryKeyValueBuffers[]]
export type XBatchResultBuffer = XStreamResult[]

export { Redis as RedisClient }

export class RedisStreamAbortedError extends Error {
  message = 'RedisStream Aborted with unprocessed results'
}

/**
 * `'entry'` mode is default and will iterate over each stream entry in each stream in the result set
 *
 * `'stream'` mode will iterate over each XREAD[GROUP] stream result
 *
 * `'batch'` mode will iterate over each XREAD[GROUP] call result
 *
 * @default `'entry'`
 */
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
   * `'entry'` mode is default and will iterate over each stream entry in each stream in the result set
   *
   * `'stream'` mode will iterate over each XREAD[GROUP] stream result
   *
   * `'batch'` mode will iterate over each XREAD[GROUP] call result
   *
   * @default `'entry'`
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
   * If iteration is slow, set this to the maximum amount of time that should elapse before pending acks will be flushed
   * This counter is reset after each iteration or ack
   *
   * TODO: not yet implemented
   */
  flushPendingAckInterval?: number
}
