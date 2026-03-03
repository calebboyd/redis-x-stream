import type { Codec, CodecOption } from './types.js'

const jsonCodec: Codec = {
  encode(value: unknown): Buffer {
    return Buffer.from(JSON.stringify(value))
  },
  decode<T>(data: Buffer): T {
    return JSON.parse(data.toString('utf8')) as T
  },
}

export async function resolveCodec(codec?: CodecOption): Promise<Codec> {
  if (!codec || codec === 'json') return jsonCodec
  if (codec === 'msgpack') {
    try {
      const { pack, unpack } = await import('msgpackr')
      return {
        encode(value: unknown): Buffer {
          return pack(value) as Buffer
        },
        decode<T>(data: Buffer): T {
          return unpack(data) as T
        },
      }
    } catch {
      throw new Error(
        'The "msgpack" codec requires the "msgpackr" package. Install it with:\n  npm install msgpackr',
      )
    }
  }
  return codec
}
