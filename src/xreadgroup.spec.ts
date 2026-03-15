import Redis from 'ioredis'
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { hostname } from 'os'
import {
  delay,
  drain,
  hydrateForTest,
  quit,
  rand,
  redisIdRegex,
  testEntries,
} from './test.util.spec.js'
import redisStream, { RedisStream } from './stream.js'
import { RedisClient } from './types.js'

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
      a = redisStream({
        streams: [streamKey],
        group: 'my-group',
      }),
      b = redisStream({
        streams: [streamKey],
        consumer: 'my-consumer',
      })
    expect(a.consumer).toEqual(`_xs_c_my-group_${hostname()}`)
    expect(a.group).toEqual('my-group')
    expect(b.group).toEqual('_xs_g_my-consumer')
    expect(b.consumer).toEqual('my-consumer')
    return Promise.all([a.quit(), b.quit()])
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
    expect(entries.length).toBeGreaterThan(5)
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
    for await (const _ of stream) {
      if (++i === 3) {
        void stream.drain()
      }
    }
    const info = (await reader.xinfo('STREAM', [...stream.streams.keys()][0])) as [
      string,
      number | string,
    ][]
    expect(info[1]).toEqual(entries.length - 5)
    expect(i).toEqual(5)
  })

  it('should acknowledge entries manually via ack()', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)

    // First pass: read all entries and manually ack them
    const stream1 = redisStream({
      group: 'my-group',
      streams: [streamKey],
    })
    for await (const [name, [id]] of stream1) {
      stream1.ack(name, id.toString())
    }

    // Second pass with same group: PEL should be empty, no pending entries
    const stream2 = redisStream({
      group: 'my-group',
      streams: [streamKey],
    })
    let secondPassCount = 0
    for await (const _ of stream2) {
      void _
      secondPassCount++
    }
    expect(secondPassCount).toEqual(0)
  })

  it('should bypass PEL with noack', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)

    // Read all entries with noack - entries never enter the PEL
    const stream1 = redisStream({
      group: 'my-group',
      streams: [streamKey],
      noack: true,
    })
    let firstPassCount = 0
    for await (const [name, entry] of stream1) {
      expect(name).toEqual(streamKey)
      expect(entry[0]).toMatch(redisIdRegex)
      firstPassCount++
    }
    expect(firstPassCount).toEqual(testEntries.length)

    // Second pass with same group + consumer: PEL should be empty since NOACK was used
    const stream2 = redisStream({
      group: 'my-group',
      streams: [streamKey],
    })
    let secondPassCount = 0
    for await (const _ of stream2) {
      void _
      secondPassCount++
    }
    expect(secondPassCount).toEqual(0)
  })

  it('should flush pending acks explicitly', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)

    // Read entries and queue acks manually (without ackOnIterate)
    const stream1 = redisStream({
      group: 'my-group',
      streams: [streamKey],
    })
    const ids: string[] = []
    for await (const [name, [id]] of stream1) {
      ids.push(id.toString())
      stream1.ack(name, id.toString())
    }
    expect(ids.length).toEqual(testEntries.length)

    // Acks were queued but should have been flushed during iteration/quit.
    // Verify by checking that a new consumer in the same group gets nothing from PEL.
    const stream2 = redisStream({
      group: 'my-group',
      streams: [streamKey],
    })
    const results = await drain(stream2)
    expect(results.get(streamKey)).toBeUndefined()
  })

  it('should flush pending acks via flush() after iteration', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)

    // Read entries, queue acks, but do NOT use ackOnIterate
    const stream1 = new RedisStream({
      group: 'my-group',
      streams: [streamKey],
      redis: reader,
    })
    for await (const [name, [id]] of stream1) {
      stream1.ack(name, id.toString())
    }
    // Stream is done but reader connection is still alive (externally provided).
    // pendingAcks should still have entries since quit() flushes them,
    // but let's test flush() with an explicit client.
    expect(stream1.done).toBe(true)

    // Verify acks were actually sent (quit flushes them)
    const stream2 = redisStream({
      group: 'my-group',
      streams: [streamKey],
    })
    let count = 0
    for await (const _ of stream2) {
      void _
      count++
    }
    expect(count).toEqual(0)
  })

  it('should clean up properly when quit is called during iteration', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)
    const stream = new RedisStream({
      group: 'my-group',
      streams: [streamKey],
      ackOnIterate: true,
    })
    let count = 0
    for await (const _ of stream) {
      void _
      count++
      if (count === 3) {
        await stream.quit()
      }
    }
    // Should have stopped after quit
    expect(count).toEqual(3)
    expect(stream.done).toBe(true)
  })

  it('should allow adding a stream on a blocked group iterable', async () => {
    const myStream = key('my-stream')
    const laterStream = key('later-stream')
    await hydrateForTest(writer, myStream)
    await hydrateForTest(writer, laterStream)
    const stream = new RedisStream({
      streams: [myStream],
      block: Infinity,
      count: testEntries.length + 50,
      group: 'my-group',
      ackOnIterate: true,
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
          stream.quit()
        }, 100)
      }
    }
    expect(i).toEqual(testEntries.length * 2 + 1)
  })

  it('should allow adding a stream with $ offset in group mode', async () => {
    const myStream = key('my-stream')
    const laterStream = key('later-stream')
    await hydrateForTest(writer, myStream)
    // Pre-populate laterStream, but use $ so the group only sees future entries
    await hydrateForTest(writer, laterStream)
    const stream = new RedisStream({
      streams: [myStream],
      block: Infinity,
      count: testEntries.length + 50,
      group: 'my-group',
      ackOnIterate: true,
    })
    let i = 0
    for await (const [streamName, _] of stream) {
      i++
      if (i === testEntries.length) {
        expect(streamName).toEqual(myStream)
        // Add laterStream with $ offset — only entries added AFTER group creation are visible
        stream.addStream({ [laterStream]: '$' }).then(() => {
          // Write new entries after the group was created
          hydrateForTest(writer, laterStream).then(() => {
            // The stream is blocked, but laterStream now has new entries
          })
        })
      }
      if (i > testEntries.length) {
        expect(streamName).toEqual(laterStream)
      }
      if (i === testEntries.length * 2 - 1) {
        setTimeout(() => {
          i++
          stream.quit()
        }, 100)
      }
    }
    // Got all entries from myStream + only newly-written entries from laterStream
    expect(i).toEqual(testEntries.length * 2 + 1)
  })

  it('should read PEL entries when adding a stream with a pre-existing group', async () => {
    const myStream = key('my-stream')
    const laterStream = key('later-stream')
    await hydrateForTest(writer, myStream)
    await hydrateForTest(writer, laterStream)

    // Simulate a consumer that previously read laterStream but didn't ack.
    // Entries remain in the PEL for this consumer.
    const prev = redisStream({
      group: 'my-group',
      consumer: 'my-consumer',
      streams: [laterStream],
    })
    const pelEntries = await drain(prev)
    expect(pelEntries.get(laterStream)?.length).toEqual(testEntries.length)

    // Same consumer restarts, begins reading myStream, later adds laterStream.
    // The PEL entries should be re-delivered via the '0' cursor read.
    const stream = new RedisStream({
      streams: [myStream],
      block: Infinity,
      count: testEntries.length + 50,
      group: 'my-group',
      consumer: 'my-consumer',
      ackOnIterate: true,
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
          stream.quit()
        }, 100)
      }
    }
    expect(i).toEqual(testEntries.length * 2 + 1)
  })

  it('should drain all PEL entries even when PEL exceeds count', async () => {
    const myStream = key('my-stream')
    const laterStream = key('later-stream')
    await hydrateForTest(writer, myStream)
    await hydrateForTest(writer, laterStream)
    expect(testEntries.length).toBeGreaterThan(3)

    // Consumer reads laterStream without acking → all entries in PEL
    const prev = redisStream({
      group: 'my-group',
      consumer: 'my-consumer',
      streams: [laterStream],
    })
    await drain(prev)

    // Same consumer restarts with count=3.  PEL has testEntries.length entries
    // which is larger than count.  All PEL entries must still be delivered
    // across multiple paginated reads.
    const stream = new RedisStream({
      streams: [myStream],
      block: Infinity,
      count: 3,
      group: 'my-group',
      consumer: 'my-consumer',
      ackOnIterate: true,
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
          stream.quit()
        }, 100)
      }
    }
    // All entries from both streams, despite count=3 << PEL size
    expect(i).toEqual(testEntries.length * 2 + 1)
  })

  it('should paginate PEL on initial boot when PEL exceeds count', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)
    expect(testEntries.length).toBeGreaterThan(3)

    // Consumer reads all entries without acking → fills PEL
    const prev = redisStream({
      group: 'my-group',
      consumer: 'my-consumer',
      streams: [streamKey],
    })
    await drain(prev)

    // Same consumer restarts with count=3 (smaller than PEL).
    // All PEL entries must be delivered via paginated reads, not
    // fetched in a single unbounded batch.
    const stream = new RedisStream({
      streams: [streamKey],
      count: 3,
      group: 'my-group',
      consumer: 'my-consumer',
      ackOnIterate: true,
    })
    let idx = 0
    for await (const [name, entry] of stream) {
      expect(name).toEqual(streamKey)
      expect(entry[0]).toMatch(redisIdRegex)
      expect(entry[1]).toEqual(testEntries[idx++])
    }
    // Every PEL entry was delivered despite count being smaller than PEL size
    expect(idx).toEqual(testEntries.length)

    // All entries should be acked — nothing left in PEL
    const verify = redisStream({ group: 'my-group', streams: [streamKey] })
    const remaining = await drain(verify)
    expect(remaining.get(streamKey)).toBeUndefined()
  })

  it('should ack the last entry when break terminates the loop', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)

    const stream = new RedisStream({
      group: 'my-group',
      streams: [streamKey],
      ackOnIterate: true,
    })
    let breakAt = 3
    for await (const _ of stream) {
      void _
      if (--breakAt === 0) break
    }
    // break triggers the finally block which calls quit().
    // quit() must flush the last ackOnIterate entry before closing.
    expect(stream.done).toBe(true)

    // Verify: re-read with the same group.  The 3 entries we iterated
    // (including the one we broke on) should all be acked, so only the
    // remaining entries are returned.
    const stream2 = redisStream({
      group: 'my-group',
      streams: [streamKey],
    })
    const remaining = await drain(stream2)
    expect(remaining.get(streamKey)?.length).toEqual(testEntries.length - 3)
  })

  it('should ack the last entry when quit is called externally', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)

    const stream = new RedisStream({
      group: 'my-group',
      streams: [streamKey],
      ackOnIterate: true,
    })
    let count = 0
    for await (const _ of stream) {
      void _
      count++
      if (count === 3) {
        await stream.quit()
      }
    }
    expect(count).toEqual(3)

    // All 3 entries (including the last one before quit) should be acked.
    const stream2 = redisStream({
      group: 'my-group',
      streams: [streamKey],
    })
    const remaining = await drain(stream2)
    expect(remaining.get(streamKey)?.length).toEqual(testEntries.length - 3)
  })

  it('should flush pending acks after flushPendingAckInterval elapses', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)

    const stream = new RedisStream({
      group: 'my-group',
      streams: [streamKey],
      flushPendingAckInterval: 50,
    })

    // Pull one entry via the iterator
    const itr = stream[Symbol.asyncIterator]()
    const { value } = await itr.next()
    const [name, [id]] = value as [string, [string, string[]]]

    // Manually ack — the ack is queued, not yet sent to Redis
    stream.ack(name, id.toString())
    expect(stream.pendingAcks.size).toBe(1)

    // Wait for the timer to fire and flush
    await delay(100)
    expect(stream.pendingAcks.size).toBe(0)

    // Verify the ack actually reached Redis: re-read the same group,
    // the acked entry should not be in the PEL.
    await stream.quit()
    const stream2 = redisStream({ group: 'my-group', streams: [streamKey] })
    const results = await drain(stream2)
    // All entries minus the one we acked
    expect(results.get(streamKey)?.length).toEqual(testEntries.length - 1)
  })

  it('should not create a timer when flushPendingAckInterval is null', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)

    const stream = new RedisStream({
      group: 'my-group',
      streams: [streamKey],
      flushPendingAckInterval: null,
    })

    const itr = stream[Symbol.asyncIterator]()
    const { value } = await itr.next()
    const [name, [id]] = value as [string, [string, string[]]]

    stream.ack(name, id.toString())
    expect(stream.pendingAcks.size).toBe(1)

    // With null, no timer fires — acks stay queued
    await delay(100)
    expect(stream.pendingAcks.size).toBe(1)

    await stream.quit()
  })

  it('should reset the flush timer on each ack', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)

    const stream = new RedisStream({
      group: 'my-group',
      streams: [streamKey],
      flushPendingAckInterval: 80,
    })

    const itr = stream[Symbol.asyncIterator]()
    const r1 = await itr.next()
    const [name1, [id1]] = r1.value as [string, [string, string[]]]
    stream.ack(name1, id1.toString())

    // Wait 50ms (< 80ms interval), then ack another entry — resets the timer
    await delay(50)
    const r2 = await itr.next()
    const [name2, [id2]] = r2.value as [string, [string, string[]]]
    stream.ack(name2, id2.toString())
    expect(stream.pendingAcks.size).toBe(1) // both acks on same stream key

    // At T=50ms we reset. Wait another 50ms (T=100ms total, 50ms since reset).
    // The 80ms timer from the reset hasn't fired yet.
    await delay(50)
    expect(stream.pendingAcks.size).toBe(1)

    // Wait another 40ms (T=140ms, 90ms since last reset > 80ms interval).
    // Timer should have fired.
    await delay(40)
    expect(stream.pendingAcks.size).toBe(0)

    await stream.quit()
  })

  it('should propagate NOGROUP error when the group is deleted during iteration', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)

    const stream = new RedisStream({
      group: 'my-group',
      streams: [streamKey],
      count: 1,
    })

    let error: Error | undefined
    let count = 0
    try {
      for await (const _ of stream) {
        void _
        count++
        if (count === 1) {
          // Delete the group from another connection while iterating
          await writer.xgroup('DESTROY', streamKey, 'my-group')
        }
      }
    } catch (e) {
      error = e as Error
    }

    expect(count).toBeGreaterThanOrEqual(1)
    expect(error).toBeDefined()
    expect(error?.message).toMatch(/NOGROUP/)
    // The generator's finally block should have cleaned up
    expect(stream.done).toBe(true)
  })

  it('should claim idle entries from a dead consumer', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)

    // Consumer A reads all entries without acking — entries are pending for A
    const consumerA = redisStream({
      group: 'my-group',
      consumer: 'consumer-a',
      streams: [streamKey],
    })
    await drain(consumerA)

    // Consumer B starts with claimIdleTime: 0 (claim everything idle > 0ms).
    // Since A never acked, all entries are claimable.
    const consumerB = new RedisStream({
      group: 'my-group',
      consumer: 'consumer-b',
      streams: [streamKey],
      claimIdleTime: 0,
      ackOnIterate: true,
    })
    let claimed = 0
    for await (const [name, entry] of consumerB) {
      expect(name).toEqual(streamKey)
      expect(entry[0]).toMatch(redisIdRegex)
      claimed++
    }
    expect(claimed).toEqual(testEntries.length)

    // All entries should now be acked — nothing left in PEL
    const verify = redisStream({ group: 'my-group', streams: [streamKey] })
    const remaining = await drain(verify)
    expect(remaining.get(streamKey)).toBeUndefined()
  })

  it('should yield both claimed and new entries', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)

    // Consumer A reads all entries without acking
    const consumerA = redisStream({
      group: 'my-group',
      consumer: 'consumer-a',
      streams: [streamKey],
    })
    await drain(consumerA)

    // Write fresh entries that no consumer has seen
    const freshEntries = testEntries.slice(0, 3)
    await hydrateForTest(writer, streamKey, ...freshEntries)

    // Consumer B claims A's idle entries AND reads new entries
    const consumerB = new RedisStream({
      group: 'my-group',
      consumer: 'consumer-b',
      streams: [streamKey],
      claimIdleTime: 0,
      ackOnIterate: true,
    })
    let total = 0
    for await (const _ of consumerB) {
      void _
      total++
    }
    // Should get all of A's entries (claimed) + the fresh entries (new)
    expect(total).toEqual(testEntries.length + freshEntries.length)
  })

  it('should not claim when claimIdleTime is not set', async () => {
    const streamKey = key('my-stream')
    await hydrateForTest(writer, streamKey)

    // Consumer A reads without acking
    const consumerA = redisStream({
      group: 'my-group',
      consumer: 'consumer-a',
      streams: [streamKey],
    })
    await drain(consumerA)

    // Consumer B without claimIdleTime — only sees new entries (none)
    const consumerB = new RedisStream({
      group: 'my-group',
      consumer: 'consumer-b',
      streams: [streamKey],
    })
    let total = 0
    for await (const _ of consumerB) {
      void _
      total++
    }
    expect(total).toEqual(0)
  })

  it('should apply the parse callback with consumer groups', async () => {
    interface Msg {
      field: string
    }
    const streamKey = key('my-stream')
    const values = await hydrateForTest(writer, streamKey)
    const stream = new RedisStream<Msg>({
      group: 'my-group',
      streams: [streamKey],
      ackOnIterate: true,
      parse: (_id, kv) => ({ field: kv[1]?.toString() }),
    })
    const parsed: Msg[] = []
    for await (const [name, [id, msg]] of stream) {
      expect(name).toEqual(streamKey)
      expect(id).toMatch(redisIdRegex)
      expect(typeof msg.field).toBe('string')
      parsed.push(msg)
    }
    expect(parsed.length).toEqual(values.length)
    expect(parsed.map((m) => m.field)).toEqual(values.map((v) => v[1]))
  })

  describe('observability', () => {
    it('info() should return stream metadata', async () => {
      const streamKey = key('my-stream')
      await hydrateForTest(writer, streamKey)
      // Use external reader so the connection survives quit()
      const stream = redisStream({ group: 'my-group', streams: [streamKey], redis: reader })
      await drain(stream)

      const info = await stream.info()
      expect(info.size).toBe(1)
      const si = info.get(streamKey)!
      expect(si.length).toEqual(testEntries.length)
      expect(si.groups).toBeGreaterThanOrEqual(1)
      expect(si.firstEntry).toBeDefined()
      expect(si.lastEntry).toBeDefined()
    })

    it('groups() should return group information', async () => {
      const streamKey = key('my-stream')
      await hydrateForTest(writer, streamKey)
      const stream = redisStream({
        group: 'my-group',
        streams: [streamKey],
        ackOnIterate: true,
        redis: reader,
      })
      await drain(stream)

      const groups = await stream.groups()
      expect(groups.length).toBeGreaterThanOrEqual(1)
      const g = groups.find((g) => g.name === 'my-group')!
      expect(g).toBeDefined()
      expect(g.consumers).toBeGreaterThanOrEqual(1)
      expect(g.lastDeliveredId).toMatch(redisIdRegex)
    })

    it('consumers() should return consumer information', async () => {
      const streamKey = key('my-stream')
      await hydrateForTest(writer, streamKey)
      const stream = redisStream({
        group: 'my-group',
        consumer: 'c1',
        streams: [streamKey],
        redis: reader,
      })
      await drain(stream)

      const consumers = await stream.consumers()
      expect(consumers.length).toBeGreaterThanOrEqual(1)
      const c = consumers.find((c) => c.name === 'c1')!
      expect(c).toBeDefined()
      expect(typeof c.pending).toBe('number')
      expect(typeof c.idle).toBe('number')
    })

    it('pending() should return PEL summary', async () => {
      const streamKey = key('my-stream')
      await hydrateForTest(writer, streamKey)

      // Read without acking so entries stay in PEL
      const stream = redisStream({
        group: 'my-group',
        consumer: 'c1',
        streams: [streamKey],
        redis: reader,
      })
      await drain(stream)

      const p = await stream.pending()
      expect(p.count).toEqual(testEntries.length)
      expect(p.minId).toMatch(redisIdRegex)
      expect(p.maxId).toMatch(redisIdRegex)
      expect(p.consumers.length).toBe(1)
      expect(p.consumers[0].name).toBe('c1')
      expect(p.consumers[0].count).toBe(testEntries.length)
    })

    it('pending() on a fully-acked group should return zero', async () => {
      const streamKey = key('my-stream')
      await hydrateForTest(writer, streamKey)
      const stream = redisStream({
        group: 'my-group',
        streams: [streamKey],
        ackOnIterate: true,
        redis: reader,
      })
      await drain(stream)

      const p = await stream.pending()
      expect(p.count).toBe(0)
      expect(p.consumers).toEqual([])
    })
  })

  describe('events', () => {
    it('should emit ready when the client connects', async () => {
      const streamKey = key('my-stream')
      const stream = new RedisStream({ group: 'my-group', streams: [streamKey] })
      const ready = await new Promise<boolean>((resolve) => {
        stream.on('ready', () => resolve(true))
        setTimeout(() => resolve(false), 2000)
      })
      expect(ready).toBe(true)
      await stream.quit()
    })
  })
})
