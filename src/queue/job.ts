import type { Codec, Job, JobMeta } from './types.js'

type DecodeResult<T> =
  | { job: Job<T> }
  | {
      parseError: Error
      raw: Buffer[]
    }

const DATA_FIELD = 'd'
const META_FIELD = 'm'

export function encodeJob<T>(data: T, meta: JobMeta, codec: Codec): [Buffer, Buffer] {
  const dataBuffer = codec.encode(data)
  const metaBuffer = codec.encode(meta)
  return [dataBuffer, metaBuffer]
}

export function decodeJob<T>(
  entryId: string,
  stream: string,
  kv: Buffer[],
  codec: Codec,
): DecodeResult<T> {
  let dataBuffer: Buffer | undefined
  let metaBuffer: Buffer | undefined

  for (let i = 0; i < kv.length; i += 2) {
    const key = kv[i]?.toString()
    const value = kv[i + 1]
    if (!value) continue
    if (key === DATA_FIELD) dataBuffer = value
    if (key === META_FIELD) metaBuffer = value
  }

  if (!dataBuffer || !metaBuffer) {
    return {
      parseError: new Error('Missing job payload or metadata'),
      raw: kv,
    }
  }

  let data: T
  let meta: JobMeta
  try {
    data = codec.decode<T>(dataBuffer)
    meta = codec.decode<JobMeta>(metaBuffer)
  } catch (error) {
    return {
      parseError: error instanceof Error ? error : new Error(String(error)),
      raw: kv,
    }
  }

  const attempt = Number(meta.attempt)
  const createdAt = Number(meta.createdAt)
  if (!Number.isFinite(attempt) || !Number.isFinite(createdAt)) {
    return {
      parseError: new Error('Invalid job metadata'),
      raw: kv,
    }
  }

  const originId = meta.originId ?? entryId
  return {
    job: {
      id: entryId,
      originId,
      stream,
      data,
      attempt,
      createdAt,
    },
  }
}
