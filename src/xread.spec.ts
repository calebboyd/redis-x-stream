import Redis from 'ioredis'
import { RedisStream } from './stream.js'
import { RedisClient } from './types.js'
import { delay, hydrateForTest, quit, times } from './test.util.spec.js'

describe('redis-x-stream xread', () => {
  let writer!: RedisClient, reader: RedisClient, prefix: string
  const streams = new Set<string>(),
    testEntries = [
      ['1', 'hi'],
      ['2', 'hello'],
      ['3', 'hai'],
    ],
    key = (name: string) => {
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
  it('should dispense in batch mode', async () => {
    const streamName = key('my-stream')
    await hydrateForTest(writer, streamName, ...testEntries)
    const iterable = new RedisStream({
      mode: 'batch',
      streams: { [streamName]: '0' },
    })
    let asserted = false
    for await (const results of iterable) {
      for (const [str, entries] of results) {
        asserted = true
        expect(str).toEqual(streamName)
        expect(entries[0][1]).toEqual(testEntries[0])
        expect(entries[1][1]).toEqual(testEntries[1])
        expect(entries[2][1]).toEqual(testEntries[2])
      }
    }
    expect(asserted).toBeTruthy()
  })
  it('should dispense in entry mode (default)', async () => {
    const streamName = key('my-straam'),
      iterable = new RedisStream(streamName),
      redisIdRegex = /\d+-\d/

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
      block = 1000,
      iterable = new RedisStream({
        block,
        streams: [streamName],
      }),
      hydrate = () => hydrateForTest(writer, streamName, ...testEntries),
      iterate = async () => {
        for await (const [str, entry] of iterable) {
          entries++
          expect(str).toEqual(streamName)
          expect(entry[0]).toMatch(redisIdRegex)
        }
      },
      consuming = iterate()

    times(1, hydrate)
    await delay(block)
    times(9, hydrate)
    await delay(block)
    times(10, hydrate)
    await consuming
    expect(entries).toEqual(testEntries.length * 20)
  })
})
