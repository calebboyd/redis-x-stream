import { describe, it, expect } from 'vitest'
import Redis from 'ioredis'
import { rand } from './test.util.spec'
import redisStream from './stream'

//eslint-disable-next-line @typescript-eslint/no-explicit-any
type JustForTests = any
describe('RedisStream xread', () => {
  it('should not quit a client it did not create', async () => {
    const created = redisStream({ streams: ['m'], block: Infinity })
    expect(created.client.status).toEqual('connecting')
    expect(created.control?.status).toEqual('connecting')
    await created.quit()
    expect(created.client.status).toEqual('end')
    expect(created.control?.status).toEqual('end')
    const redis = new Redis()
    const redisControl = new Redis()
    const passed = redisStream({
      streams: ['m'],
      redis,
      redisControl,
      block: Infinity,
    })
    expect(passed.client.status).toEqual('connecting')
    expect(passed.control?.status).toEqual('connecting')
    await passed.quit()
    expect(passed.client.status).toEqual('connecting')
    expect(passed.control?.status).toEqual('connecting')
    await Promise.all([passed.client.ping(), passed.control?.ping()])
    expect(passed.client.status).toEqual('ready')
    expect(passed.control?.status).toEqual('ready')
    redis.disconnect()
    redisControl.disconnect()
  })

  it('should accept redis options (string or options object)', () => {
    const str = redisStream({ redis: 'redis://localhost:6739', streams: ['my-stream'] }),
      obj = redisStream({ redis: { host: 'localhost' }, streams: ['m'] })
    return Promise.all([str.quit(), obj.quit()])
  })

  it('should not accept redis control options if stream is not blocking', async () => {
    expect(() =>
      redisStream({ redisControl: 'redis://localhost:6739', streams: ['my-stream'] })
    ).toThrow(
      'redisControl options are only needed in blocking mode: `block: Infinity` | `block: 0`'
    )
    const stream = redisStream({
      redisControl: 'redis://localhost:6739',
      streams: ['my-stream'],
      block: 0,
    })
    await stream.quit()
  })

  it('should not accept unrecognized options', () => {
    const random = { some: 'prop', thing: 'wrong' }
    expect(() => redisStream({ redis: { host: 'localhost' }, streams: ['m'], ...random })).toThrow(
      `Unexpected option(s): "some","thing"`
    )
  })

  it('should manage initial and finished state', async () => {
    const stream = redisStream({ streams: ['my-stream' + rand()], count: 2 })
    expect(stream.count).toEqual(2)
    expect(stream.noack).toEqual(false)
    expect(stream.block).toBeUndefined()
    expect(stream.deleteOnAck).toBeFalsy()
    expect(stream.done).toBeFalsy()
    for await (const result of stream) {
      void result
    }
    expect(stream.done).toBeTruthy()
    return stream.quit()
  })

  it('should accept string or array or record describing streams to consume', () => {
    const stream1 = 'str' + rand(),
      stream2 = 'str' + rand(),
      str = redisStream(stream1, stream2),
      arr = redisStream({ streams: [stream1, stream2] }),
      rec = redisStream({ streams: { [stream1]: '0', [stream2]: '0' } }),
      serializeMap = (map: Map<string, string>) => JSON.stringify([...map.entries()].sort())

    expect(arr.streams.size).toEqual(str.streams.size)
    expect(rec.streams.size).toEqual(str.streams.size)
    expect(serializeMap(str.streams)).toEqual(serializeMap(arr.streams))
    expect(serializeMap(str.streams)).toEqual(serializeMap(rec.streams))
    return Promise.all([str.quit(), arr.quit(), rec.quit()])
  })

  it('should start at zero by default for xread', () => {
    const myStream = 'key' + rand()
    const stream = redisStream(myStream)
    expect(stream.streams.get(myStream)).toEqual('0')
    return stream.quit()
  })

  it('should optionally start at the passed id', () => {
    const myStream = 'key' + rand()
    const stream = redisStream({ streams: { [myStream]: '$' } })
    expect(stream.streams.get(myStream)).toEqual('$')
    return stream.quit()
  })

  it('should set noack, block, deleteOnAck if passed (truthy)', () => {
    const stream = redisStream({
      streams: [rand()],
      block: 1000,
      noack: (true + '') as JustForTests,
      deleteOnAck: (true + '') as JustForTests,
    })
    expect(stream.noack).toEqual(true)
    expect(stream.block).toEqual(1000)
    expect(stream.deleteOnAck).toEqual(true)
    return stream.quit()
  })
})
