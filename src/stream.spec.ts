import { describe, it, expect, vi } from 'vitest'
import Redis from 'ioredis'
import { rand } from './test.util.spec'
import redisStream from './stream'
import { delay } from './test.util.spec.js'

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
      redisStream({ redisControl: 'redis://localhost:6739', streams: ['my-stream'] }),
    ).toThrow(
      'redisControl options are only needed in blocking mode: `block: Infinity` | `block: 0`',
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
      `Unexpected option(s): "some","thing"`,
    )
  })

  it('should throw when no stream keys are provided', () => {
    expect(() => redisStream({ streams: [] })).toThrow('At least one stream key is required')
    expect(() => redisStream({ streams: {} })).toThrow('At least one stream key is required')
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

  it('should use the explicitly passed client in flush()', async () => {
    const stream = redisStream({
      streams: [rand()],
      block: Infinity,
      group: 'g',
      consumer: 'c',
    })
    // Queue an ack so flush() has work to do
    stream.ack(rand(), '1-0')

    // flush() with an explicit client should use that client, not control
    const flushClient = new Redis()
    const spy = vi.spyOn(flushClient, 'pipeline')
    await stream.flush(flushClient)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
    flushClient.disconnect()
    return stream.quit()
  })

  it('should forward control connection errors', async () => {
    const redis = new Redis()
    const redisControl = new Redis()
    const stream = redisStream({
      streams: ['m-' + rand()],
      redis,
      redisControl,
      block: Infinity,
    })

    const error = new Error('control-error')
    const received = new Promise<Error>((resolve) => {
      stream.on('error', resolve)
    })

    const listener = redisControl.listeners('error')[0] as ((err: Error) => void) | undefined
    expect(listener).toBeDefined()
    listener?.(error)
    await expect(received).resolves.toBe(error)

    await stream.quit()
    redis.disconnect()
    redisControl.disconnect()
  })

  it('should close unreachable created clients promptly', async () => {
    const stream = redisStream({
      streams: ['m-' + rand()],
      redis: 'redis://127.0.0.1:6739',
      redisControl: 'redis://127.0.0.1:6739',
      block: Infinity,
    })

    const result = await Promise.race([
      stream.quit().then(() => 'closed'),
      delay(1000).then(() => 'timeout'),
    ])

    expect(result).toBe('closed')
  })
})
