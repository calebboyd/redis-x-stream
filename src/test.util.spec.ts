import { RedisClient, StreamEntry, XEntryResult } from './types.js'
import { afterAll } from 'vitest'
import mkDebug from 'debug'
import { randomInt } from 'node:crypto'
import Chance from 'chance'

const seed = Number(process.env.TEST_SEED) || randomInt(Date.now())
const chance = new Chance(seed)

const debug = mkDebug('test-redis-x-stream')

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms)),
  times = <T>(count: number, fn: (_: undefined, i: number) => T): Array<T> =>
    Array.from(Array(count), fn) as T[],
  quit = async (client: RedisClient): Promise<void> => {
    await client.quit()
    return new Promise((resolve) => client.once('end', resolve))
  },
  randNum = (min: number, max: number) => chance.integer({ min, max }),
  rand = (): string => chance.string({}),
  drain = async (iterable: AsyncIterable<XEntryResult>): Promise<Map<string, StreamEntry[]>> => {
    const results = new Map<string, StreamEntry[]>()
    for await (const [streamName, entry] of iterable) {
      const entries = results.get(streamName) || []
      entries.push(entry)
      results.set(streamName, entries)
    }
    return results
  },
  redisIdRegex = /\d+-\d/,
  testEntries = times(randNum(7, 23), (_, i) => [i.toString(), rand()])
async function hydrateForTest(writer: RedisClient, stream: string, ...values: string[][]) {
  if (!values.length) values = testEntries
  const pipeline = writer.pipeline()
  for (const [key, value] of values) {
    debug(`xadd ${stream} * ${key} ${value}`)
    pipeline.xadd(stream, '*', key, value)
  }
  await pipeline.exec()
  return values
}

afterAll(() => {
  console.log(`Seed set to: ${seed}`)
})

export { delay, times, quit, hydrateForTest, rand, randNum, testEntries, redisIdRegex, drain }
