import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import redisStream, { RedisStream } from './stream.js'
import { hostname } from 'os'
import { drain, hydrateForTest, quit, rand, redisIdRegex, testEntries } from './test.util.spec.js'
import { RedisClient } from './types.js'
import Redis from 'ioredis'

describe('redis-x-stream xreadgroup', () => {
  let writer!: RedisClient, reader: RedisClient, prefix: string
  const streams = new Set<string>(),
    key = (name?: string) => {
      name = prefix + name
      if (!streams.has(name)) streams.add(name)
      return name
    }
  beforeAll(() => void (writer = new Redis()))
  afterAll(() => quit(writer))

  beforeEach(() => {
    prefix = rand()
    reader = new Redis()
  })
  afterEach(async () => {
    for (const stream of streams) {
      await writer.del(stream)
    }
    streams.clear()
    return quit(reader)
  })

  it('should create a consumer or group if one is not provided', () => {
    const streamKey = key('my-stream'),
      cstream = redisStream({
        streams: [streamKey],
        group: 'my-group',
      }),
      gstream = redisStream({
        streams: [streamKey],
        consumer: 'my-consumer',
      })
    expect(cstream.consumer).toEqual(`_xs_c_my-group_${hostname()}`)
    expect(cstream.group).toEqual('my-group')
    expect(gstream.group).toEqual('_xs_g_my-consumer')
    expect(gstream.consumer).toEqual('my-consumer')
    return Promise.all([cstream.quit(), gstream.quit()])
  })

  it('should automatically create a group', async () => {
    const streamKey = key('my-stream'),
      stream = redisStream({ group: 'my-group', streams: [streamKey] })
    await hydrateForTest(writer, streamKey)
    await drain(stream)
    return stream.quit()
  })

  it('should dispense both new and pending entries', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)
    let i = 2
    //The second iteration causes the PEL to be sent back (eg, the same entries)
    while (i--) {
      const stream = redisStream({ group: 'my-group', streams: [streamKey] })
      let idx = 0,
        asserted = false
      for await (const [name, entry] of stream) {
        asserted = true
        expect(name).toEqual(streamKey)
        expect(entry[0]).toMatch(redisIdRegex)
        expect(entry[1]).toEqual(testEntries[idx++])
      }
      expect(asserted).toEqual(true)
      expect(idx).toEqual(testEntries.length)
    }
  })
  it('should acknowledge entries on iteration', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)
    let i = 2
    while (i--) {
      const stream = redisStream({
        group: 'my-group',
        streams: [streamKey],
        ackOnIterate: true,
      })
      let idx = 0
      for await (const [name, entry] of stream) {
        expect(name).toEqual(streamKey)
        expect(entry[0]).toMatch(redisIdRegex)
        expect(entry[1]).toEqual(testEntries[idx++])
      }
      if (i === 0) expect(idx).toEqual(0)
      else expect(idx).toEqual(testEntries.length)
      await stream.quit()
    }
    const newGroup = redisStream({
      group: 'my-group2',
      streams: [streamKey],
    })
    const results = await drain(newGroup)
    expect(results.get(streamKey)?.length).toEqual(testEntries.length)
  })
  it('should delete entries on ack', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)
    let i = 2
    while (i--) {
      const stream = redisStream({
        group: 'my-group',
        streams: [streamKey],
        ackOnIterate: true,
        deleteOnAck: true,
      })
      let idx = 0
      for await (const [name, entry] of stream) {
        expect(name).toEqual(streamKey)
        expect(entry[0]).toMatch(redisIdRegex)
        expect(entry[1]).toEqual(testEntries[idx++])
      }
      if (i === 0) expect(idx).toEqual(0)
      else expect(idx).toEqual(testEntries.length)
      await stream.quit()
    }
    const newGroup = redisStream({
      group: 'my-group2',
      streams: [streamKey],
    })
    const results = await drain(newGroup)
    expect(results.get(streamKey)).toBeUndefined()
  })

  it('should drain entries', async () => {
    const streamKey = key('my-stream')
    //hydrate more than 5
    const entries = await hydrateForTest(writer, streamKey)
    //read up to 5 entries max
    const stream = new RedisStream({
      streams: [streamKey],
      count: 5,
      block: Infinity,
      group: 'my-group',
      ackOnIterate: true,
      deleteOnAck: true,
    })
    let i = 0
    for await (const [streamName, [id, keyvals]] of stream) {
      if (++i === 3) {
        void stream.drain()
      }
    }
    const info = (await reader.xinfo('STREAM', [...stream.streams.keys()][0])) as [
      string,
      number | string
    ][]
    expect(info[1]).toEqual(entries.length - 5)
    expect(i).toEqual(5)
  })

  //TODO: test some redis error
  //TODO: xreadgroup + noack
  //non-iterative calls
  //TODO: xreadgroup + flushPendingAckCount
  //TODO: xreadgroup + flushPendingAckInterval
})
