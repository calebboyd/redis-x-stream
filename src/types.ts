import { Redis } from 'ioredis'
import { Mode } from './mode'

export type StreamEntryId = string
export type StreamKey = string
export type StreamEntryKeyValues = string[]
export type StreamEntry = [StreamEntryId, StreamEntryKeyValues]

//Result Types from iterator
export type XStreamResult = [StreamKey, StreamEntry[]]
export type XBatchResult = XStreamResult[]

//this type is not returned by redis but we're going to use it to dispense entries
export type XEntryResult = [StreamKey, StreamEntry]

export { Redis as RedisClient }

export class RedisStreamAbortedError extends Error {
  message = 'RedisStream Aborted with unprocessed results'
}

export interface XIterableOptions<T extends Mode> {
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
   * Redis stream keys to be read. If a Record is provided each value is the starting id for that stream
   */
  keys: string[] | Record<string, string>
  /**
   * The IORedis client connection.
   * NOTE: by default this connection becomes a "reader" when block > 0
   */
  redis?: Redis
  /**
   * The longest amount of time in milliseconds the dispenser should block
   * while waiting for new entries on any stream
   * @default 5000
   */
  blockMs?: number
  mode?: T
  /**
   * The maximum number of entries to retrieve in a single read operation
   * Defaults to streamKeys * concurrency
   * @default 100
   */
  count?: number
  /**
   * The number of entries to batch ack and remove from the PEL
   * Default behavior or a dispenser is "at least once delivery"
   *
   * The closer the ackBatchSize is to 1 the closer you are to achieving "exactly once delivery"
   * At the cost of more redis calls.
   * The higher ackBatchSize is - a dispenser failure/recovery could deliver messages more than once from the PEL
   *
   * An ackBatchSize of 0 utilizes the NOACK flag -- items are not added to a PEL and ackIntervalMs is ignored.
   * @default count
   */
  ackBatchSize?: number
  /**
   * The amount of time to wait before acknowledging queued acks
   * This timer accounts for periods where ackBatchSize is not yet reached.
   * NOTE: Graceful shutdown will flush buffered acks from the PEL.
   */
  flushAckDelayMs?: number
}
