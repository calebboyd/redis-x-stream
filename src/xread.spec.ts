import Redis from 'ioredis'
import { RedisStream } from './stream.js'
import { RedisClient } from './types.js'
import { delay, hydrateForTest, quit, times, testEntries, redisIdRegex } from './test.util.spec.js'

describe('redis-x-stream xread', () => {
  let writer!: RedisClient, reader: RedisClient, prefix: string
  const streams = new Set<string>(),
    key = (name?: string) => {
      name = prefix + name
      if (!streams.has(name)) streams.add(name)
      return name
    }
  beforeAll(() => {
    writer = new Redis()
  })
  afterAll(() => quit(writer))

  beforeEach(() => {
    prefix = Math.random().toString(36).slice(6) + '_'
    reader = new Redis()
  })
  afterEach(async () => {
    for (const stream of streams) {
      await writer.del(stream)
    }
    streams.clear()
    return quit(reader)
  })
  it('should dispense in entry mode (default)', async () => {
    const streamName = key('my-straam'),
      iterable = new RedisStream(streamName)
    await hydrateForTest(writer, streamName, ...testEntries)
    let entryIdx = 0,
      asserted = false

    for await (const [str, entry] of iterable) {
      asserted = true
      expect(str).toEqual(streamName)
      expect(entry[0]).toMatch(redisIdRegex)
      expect(entry[1]).toEqual(testEntries[entryIdx++])
    }
    expect(asserted).toBeTruthy()
    expect(entryIdx).toEqual(testEntries.length)
  })

  it('should block waiting for new entries', async () => {
    let entries = 0
    const streamName = key('my-stream'),
      redisIdRegex = /\d+-\d/,
      block = 200,
      iterable = new RedisStream({
        block,
        streams: [streamName],
      }),
      hydrate = () => hydrateForTest(writer, streamName),
      iterate = async () => {
        for await (const [str, entry] of iterable) {
          entries++
          expect(str).toEqual(streamName)
          expect(entry[0]).toMatch(redisIdRegex)
        }
      }
    await hydrate()
    const consuming = iterate()
    await delay(block)
    times(9, hydrate)
    await delay(block)
    times(10, hydrate)
    await consuming
    expect(entries).toEqual(testEntries.length * 20)
  })

  it('should throw if ack is called without a group or consumer', async () => {
    const streamName = key('my-stream')
    const stream = new RedisStream(streamName)
    const values = await hydrateForTest(writer, streamName)
    let ackAttempts = 0
    for await (const [_, [id, __]] of stream) {
      try {
        await stream.ack(id)
      } catch (e: unknown) {
        if (e instanceof Error) {
          ackAttempts++
          expect(e.message).toBe('Cannot ack entries read outside of a consumer group')
        }
      }
    }
    expect(values.length).toBeGreaterThan(1)
    expect(ackAttempts).toBe(values.length)
  })

  it('should not allow re-iteration (done is set)', async () => {
    const streamName = key('my-stream'),
      iterable = new RedisStream(streamName)
    let entries = 0
    const values = await hydrateForTest(writer, streamName)
    const iterate = async () => {
      for await (const [str, entry] of iterable) {
        entries++
        expect(str).toEqual(streamName)
        expect(entry[0]).toMatch(redisIdRegex)
      }
    }
    expect(iterable.done).toBeFalsy()
    await iterate()
    expect(iterable.done).toBeTruthy()
    expect(entries).toEqual(values.length)
    await iterate()
    expect(entries).toEqual(values.length)
  })
})
