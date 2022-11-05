import { RedisClient, StreamEntry, XEntryResult } from './types.js'

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms)),
  times = <T>(count: number, fn: () => T): Array<T> => Array.from(Array(count), fn) as T[],
  quit = async (client: RedisClient): Promise<void> => {
    await client.quit()
    return new Promise((resolve) => client.once('end', resolve))
  },
  rand = (): string => Math.random().toString(36).slice(6),
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
  testEntries = [
    ['1', 'hi'],
    ['2', 'hello'],
    ['3', 'hai'],
  ]
async function hydrateForTest(writer: RedisClient, stream: string, ...values: string[][]) {
  if (!values.length) values = testEntries
  const pipeline = writer.pipeline()
  for (const [key, value] of values) {
    pipeline.xadd(stream, '*', key, value)
  }
  await pipeline.exec()
  return values
}

export { delay, times, quit, hydrateForTest, rand, testEntries, redisIdRegex, drain }
