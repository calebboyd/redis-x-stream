import RedisStream from './stream.js'
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
  beforeAll(() => (writer = new Redis()))
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
      cstream = new RedisStream({
        streams: [streamKey],
        group: 'my-group',
      }),
      gstream = new RedisStream({
        streams: [streamKey],
        consumer: 'my-consumer',
      })
    expect(cstream.consumer).toEqual('_xs_c_my-group')
    expect(cstream.group).toEqual('my-group')
    expect(gstream.group).toEqual('_xs_g_my-consumer')
    expect(gstream.consumer).toEqual('my-consumer')
    return Promise.all([cstream.quit(), gstream.quit()])
  })

  it('should automatically create a group', async () => {
    const streamKey = key('my-stream'),
      stream = new RedisStream({ group: 'my-group', streams: [streamKey] })
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
      const stream = new RedisStream({ group: 'my-group', streams: [streamKey] })
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
      await stream.quit()
    }
  })
  it('should acknowledge entries on iteration', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)
    let i = 2
    while (i--) {
      const stream = new RedisStream({
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
    const newGroup = new RedisStream({
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
      const stream = new RedisStream({
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
    const newGroup = new RedisStream({
      group: 'my-group2',
      streams: [streamKey],
    })
    const results = await drain(newGroup)
    expect(results.get(streamKey)).toBeUndefined()
  })

  //TODO test some redis error

  //TODO xreadgroup + block
  //TODO xreadgroup + noack
  //TODO explicit COUNT
  //non-iterative calls
  //TODO xreadgroup + flushPendingAckCount
  //TODO xreadgroup + flushPendingAckInterval
})
