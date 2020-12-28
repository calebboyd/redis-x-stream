import { RedisClient } from './types'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  times = <T>(count: number, fn: () => T) => Array.from(Array(count), fn) as T[],
  quit = async (client: RedisClient) => {
    await client.quit()
    return new Promise((resolve) => client.once('end', resolve))
  }

function hydrateForTest(writer: RedisClient, stream: string, ...values: string[][]): Promise<any> {
  const pipeline = writer.pipeline()
  for (const [key, value] of values) {
    pipeline.xadd(stream, '*', key, value)
  }
  return pipeline.exec()
}

export { delay, times, quit, hydrateForTest }
