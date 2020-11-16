import Redis from 'ioredis'
import { RedisStream } from './redis-x-iterable'

type RedisClient = Redis.Redis

function hydrateForTest(writer: RedisClient, stream: string, ...values: string[][]) {
  const pipeline = writer.pipeline()
  for (const [key, value] of values) {
    pipeline.xadd(stream, '*', key, value)
  }
  return pipeline.exec()
}

describe('redis-x-iterable', () => {
  let writer!: RedisClient, reader: RedisClient, prefix: string
  const streams = new Set<string>()
  const testEntries = [
    ['1', 'hi'],
    ['2', 'hello'],
    ['3', 'hai'],
  ]

  function stream(key: string) {
    key = prefix + key
    if (!streams.has(key)) streams.add(key)
    return key
  }
  beforeAll(() => {
    writer = new Redis()
  })
  afterAll(async () => {
    await writer.quit()
    return writer.disconnect()
  })
  beforeEach(() => {
    prefix = Math.random().toString(36).slice(6) + '_'
    reader = new Redis()
  })
  afterEach(async () => {
    for (const stream of streams) {
      await writer.del(stream)
    }
    streams.clear()
    await reader.quit()
    return reader.disconnect()
  })
  it('should dispense in batch mode', async () => {
    const streamName = stream('my-stream')
    await hydrateForTest(writer, streamName, ...testEntries)
    const iterable = new RedisStream({
      redis: reader,
      blockMs: 2,
      mode: 'batch',
      keys: { [streamName]: '0' },
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
  it('should dispense in entry mode', async () => {
    const streamName = stream('my-stream')
    await hydrateForTest(writer, streamName, ...testEntries)
    const iterable = new RedisStream(streamName)
    let entryIdx = 0
    let asserted = false
    const redisIdRegex = /\d+-\d/
    for await (const [str, entry] of iterable) {
      asserted = true
      expect(str).toEqual(streamName)
      expect(entry[0]).toMatch(redisIdRegex)
      expect(entry[1]).toEqual(testEntries[entryIdx++])
    }
    expect(asserted).toBeTruthy()
    expect(entryIdx).toEqual(testEntries.length)
  })
})
