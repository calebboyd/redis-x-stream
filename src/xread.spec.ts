import Redis from 'ioredis'
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import {
  delay,
  hydrateForTest,
  quit,
  testEntries,
  redisIdRegex,
  randNum,
} from './test.util.spec.js'
import { RedisStream } from './stream.js'
import { RedisClient } from './types.js'

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
  it('should dispense entries', async () => {
    const streamName = key('my-stream'),
      iterable = new RedisStream({ stream: streamName, count: randNum(1, 20) })
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
      block = 200,
      iterable = new RedisStream({
        block,
        count: randNum(1, 50),
        streams: [streamName],
      })
    const hydrate = () => hydrateForTest(writer, streamName)
    await hydrate()
    for await (const _ of iterable) {
      if (entries++ === testEntries.length - 1) {
        delay(block - 20).then(hydrate)
      }
    }
    expect(entries).toEqual(testEntries.length * 2)
  })

  it('should throw if ack is called without a group or consumer', async () => {
    const streamName = key('my-stream')
    const stream = new RedisStream({ stream: [streamName], count: randNum(1, 500) })
    const values = await hydrateForTest(writer, streamName)
    let ackAttempts = 0
    for await (const [_, [id]] of stream) {
      void _
      try {
        stream.ack(streamName, id)
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

  it('should allow adding a stream on a blocked iterable', async () => {
    const myStream = key('my-stream')
    const laterStream = key('later-stream')
    await hydrateForTest(writer, myStream)
    await hydrateForTest(writer, laterStream)
    const stream = new RedisStream({
      streams: [myStream],
      block: Infinity,
      count: randNum(300, 400),
    })
    let i = 0
    for await (const [streamName, _] of stream) {
      i++
      if (i === testEntries.length) {
        expect(streamName).toEqual(myStream)
        setTimeout(() => {
          expect(stream.reading).toBe(true)
          stream.addStream(laterStream)
        })
      }
      if (i > testEntries.length) {
        expect(streamName).toEqual(laterStream)
      }
      if (i === testEntries.length * 2 - 1) {
        setTimeout(() => {
          i++
          stream.quit() //break;
        }, 100)
      }
    }
    //stream will block indefinitely (i++ in the future to assert after loop)
    expect(i).toEqual(testEntries.length * 2 + 1)
  })

  it('should clean up properly when quit is called mid-iteration', async () => {
    const streamName = key('my-stream'),
      iterable = new RedisStream({ stream: streamName, count: randNum(1, 5) })
    await hydrateForTest(writer, streamName)
    let entries = 0
    for await (const _ of iterable) {
      void _
      entries++
      if (entries === 3) {
        await iterable.quit()
      }
    }
    expect(entries).toEqual(3)
    expect(iterable.done).toBeTruthy()
  })

  it('should clean up created connections when break terminates the loop', async () => {
    const streamName = key('my-stream'),
      iterable = new RedisStream({ stream: streamName, count: randNum(1, 5) })
    await hydrateForTest(writer, streamName)
    let entries = 0
    for await (const _ of iterable) {
      void _
      entries++
      if (entries === 3) break
    }
    // break triggers the generator's finally block which calls quit()
    expect(entries).toEqual(3)
    expect(iterable.done).toBeTruthy()
    expect(iterable.client.status).toEqual('end')
  })

  it('should apply the parse callback to each entry', async () => {
    interface Parsed {
      key: string
      value: string
    }
    const streamName = key('my-stream')
    const values = await hydrateForTest(writer, streamName)
    const iterable = new RedisStream<Parsed>({
      stream: streamName,
      count: randNum(1, 5),
      parse: (id, kv, stream) => {
        expect(id).toMatch(redisIdRegex)
        expect(stream).toEqual(streamName)
        return { key: kv[0], value: kv[1] }
      },
    })
    let i = 0
    for await (const [name, [id, parsed]] of iterable) {
      expect(name).toEqual(streamName)
      expect(id).toMatch(redisIdRegex)
      // parsed is typed as Parsed
      expect(parsed.key).toEqual(values[i][0])
      expect(parsed.value).toEqual(values[i][1])
      i++
    }
    expect(i).toEqual(values.length)
  })

  it('should not allow re-iteration (done is set)', async () => {
    const streamName = key('my-stream'),
      iterable = new RedisStream({ stream: streamName, count: randNum(1, 2) })
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
