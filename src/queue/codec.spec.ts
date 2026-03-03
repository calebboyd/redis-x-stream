import { describe, expect, it } from 'vitest'
import { resolveCodec } from './codec.js'

describe('queue codec', () => {
  it('defaults to json', async () => {
    const codec = await resolveCodec()
    const payload = { name: 'default', count: 1, nested: { ok: true } }
    const encoded = codec.encode(payload)
    expect(Buffer.isBuffer(encoded)).toBe(true)
    expect(encoded.toString('utf8')).toBe(JSON.stringify(payload))
    const decoded = codec.decode<typeof payload>(encoded)
    expect(decoded).toEqual(payload)
  })

  it('roundtrips msgpack', async () => {
    const codec = await resolveCodec('msgpack')
    const payload = { name: 'test', count: 2, nested: { ok: true } }
    const encoded = codec.encode(payload)
    expect(Buffer.isBuffer(encoded)).toBe(true)
    const decoded = codec.decode<typeof payload>(encoded)
    expect(decoded).toEqual(payload)
  })

  it('roundtrips json', async () => {
    const codec = await resolveCodec('json')
    const payload = { name: 'json', count: 5, list: ['a', 'b'] }
    const encoded = codec.encode(payload)
    expect(Buffer.isBuffer(encoded)).toBe(true)
    const decoded = codec.decode<typeof payload>(encoded)
    expect(decoded).toEqual(payload)
  })
})
