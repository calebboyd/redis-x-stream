import type { RedisClient, RedisOptions } from '../types.js'

export interface Codec {
  encode(value: unknown): Buffer
  decode<T>(data: Buffer): T
}

export type CodecOption = Codec | 'msgpack' | 'json'

export interface QueueOptions {
  redis?: RedisClient | string | RedisOptions
  codec?: CodecOption
}

export interface BackoffOptions {
  strategy: 'fixed' | 'exponential'
  delay: number
  maxDelay?: number
}

export interface WorkerOptions<T> {
  handler: Handler<T>
  group: string
  consumer?: string
  concurrency?: number
  retries?: number
  backoff?: BackoffOptions
  dlq?: string
  output?: string
  codec?: CodecOption
  redis?: RedisClient | string | RedisOptions
  block?: number
  count?: number
  claimIdleTime?: number
  deleteOnAck?: boolean
  flushPendingAckInterval?: number | null
}

export interface JobMeta {
  attempt: number
  createdAt: number
  originId?: string
}

export interface Job<T> {
  readonly id: string
  readonly originId: string
  readonly stream: string
  readonly data: T
  readonly attempt: number
  readonly createdAt: number
}

export interface DLQEntry<T> {
  data: T | string[]
  parseError?: true
  error: string
  originalId: string
  originalStream: string
  attempt: number
  failedAt: number
  createdAt: number
}

export interface Context {
  forward(stream: string, data: unknown): void
  readonly signal: AbortSignal
}

export type Handler<T> = (job: Job<T>, ctx: Context) => Promise<unknown>

export interface WorkerEvents<T> {
  completed: (job: Job<T>, result: unknown) => void
  failed: (job: Job<T>, error: Error) => void
  retrying: (job: Job<T>, error: Error, attempt: number) => void
  error: (error: Error) => void
  ready: () => void
  closed: () => void
}
