import Redis from 'ioredis'
import RedisStream from './stream'
import { rand } from './test.util.spec'

describe('RedisStream xread', () => {
  it('should accept a mode', async () => {
    const streams = ['my-stream'],
      bad = () => new RedisStream({ mode: 'wat' as any, streams }),
      entry = new RedisStream({ mode: 'entry', streams }),
      batch = new RedisStream({ mode: 'batch', streams }),
      stream = new RedisStream({ mode: 'stream', streams })

    expect(bad).toThrow(`"wat" is not a valid Mode - use one of:  'entry' | 'batch' | 'stream'`)
    await Promise.all([entry.quit(), batch.quit(), stream.quit()])
  })

  it('should not quit a client it did not create', async () => {
    const created = new RedisStream('m')
    expect(created.client.status).toEqual('connecting')
    await created.quit()
    expect(created.client.status).toEqual('end')
    const redis = new Redis()
    const passed = new RedisStream({ streams: ['m'], redis })
    expect(passed.client.status).toEqual('connecting')
    await passed.quit()
    expect(passed.client.status).toEqual('connecting')
    await passed.client.ping()
    expect(passed.client.status).toEqual('ready')
    redis.disconnect()
  })

  it('should accept redis options (string or options object)', () => {
    const str = new RedisStream({ redis: 'redis://localhost:6739', streams: ['my-stream'] }),
      obj = new RedisStream({ redis: { host: 'localhost' }, streams: ['m'] })
    return Promise.all([str.quit(), obj.quit()])
  })

  it('should manage initial and finished state', async () => {
    const stream = new RedisStream('my-stream' + rand())
    expect(stream.count).toEqual(100)
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
      str = new RedisStream(stream1, stream2),
      arr = new RedisStream({ streams: [stream1, stream2] }),
      rec = new RedisStream({ streams: { [stream1]: '0', [stream2]: '0' } }),
      serializeMap = (map: Map<any, any>) => JSON.stringify([...map.entries()].sort())

    expect(arr.streams.size).toEqual(str.streams.size)
    expect(rec.streams.size).toEqual(str.streams.size)
    expect(serializeMap(str.streams)).toEqual(serializeMap(arr.streams))
    expect(serializeMap(str.streams)).toEqual(serializeMap(rec.streams))
    return Promise.all([str.quit(), arr.quit(), rec.quit()])
  })

  it('should start at zero by default for xread ', () => {
    const myStream = 'key' + rand()
    const stream = new RedisStream(myStream)
    expect(stream.streams.get(myStream)).toEqual('0')
    return stream.quit()
  })

  it('should optionally start at the passed id', () => {
    const myStream = 'key' + rand()
    const stream = new RedisStream({ streams: { [myStream]: '$' } })
    expect(stream.streams.get(myStream)).toEqual('$')
    return stream.quit()
  })

  it('should set noack, block, deleteOnAck if passed (truthy)', () => {
    const stream = new RedisStream({
      streams: [rand()],
      block: 1000,
      noack: (true + '') as any,
      deleteOnAck: (true + '') as any,
    })
    expect(stream.noack).toEqual(true)
    expect(stream.block).toEqual(1000)
    expect(stream.deleteOnAck).toEqual(true)
    return stream.quit()
  })
})
