import { createHash } from 'crypto'
import type { RedisClient } from '../types.js'

//eslint-disable-next-line @typescript-eslint/no-explicit-any
type EvalFn = (...args: any[]) => Promise<unknown>

export class LuaScript {
  private readonly sha: string

  constructor(
    private readonly source: string,
    private readonly numKeys: number,
  ) {
    this.sha = createHash('sha1').update(source).digest('hex')
  }

  async exec(client: RedisClient, ...args: (string | Buffer | number)[]): Promise<unknown> {
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = client as any
    const evalshaBuffer: EvalFn = c.evalshaBuffer.bind(c)
    const evalBuffer: EvalFn = c.evalBuffer.bind(c)
    try {
      return await evalshaBuffer(this.sha, this.numKeys, ...args)
    } catch (err: unknown) {
      if (err instanceof Error && err.message?.includes('NOSCRIPT')) {
        return await evalBuffer(this.source, this.numKeys, ...args)
      }
      throw err
    }
  }
}

/**
 * Check Redis cache, conditionally acquire fetch lock.
 * KEYS[1] = cache:{key}  KEYS[2] = cache:lock:{key}
 * ARGV[1] = lock token    ARGV[2] = lock TTL (milliseconds)
 * Returns: {1, value} cache hit | {2} lock acquired | {3} lock held
 */
export const CACHE_GET = new LuaScript(
  `local v = redis.call('GET', KEYS[1])
if v then return {1, v} end
local ok = redis.call('SET', KEYS[2], ARGV[1], 'NX', 'PX', ARGV[2])
if ok then return {2} end
return {3}`,
  2,
)

/**
 * Store value in cache, broadcast result via stream, release lock.
 * KEYS[1] = cache:{key}  KEYS[2] = results stream  KEYS[3] = cache:lock:{key}
 * ARGV[1] = encoded value  ARGV[2] = TTL (milliseconds)  ARGV[3] = MAXLEN
 * ARGV[4] = key name       ARGV[5] = lock token
 * Returns: 1 on success, 0 on token mismatch
 */
export const CACHE_SET = new LuaScript(
  `local cur = redis.call('GET', KEYS[3])
if cur ~= ARGV[5] then return 0 end
redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])
redis.call('XADD', KEYS[2], 'MAXLEN', '~', ARGV[3], '*', 'k', ARGV[4], 'v', ARGV[1], 't', 'value')
redis.call('DEL', KEYS[3])
return 1`,
  3,
)

/**
 * Delete cached value and broadcast tombstone.
 * KEYS[1] = cache:{key}  KEYS[2] = results stream
 * ARGV[1] = MAXLEN  ARGV[2] = key name
 */
export const CACHE_INVALIDATE = new LuaScript(
  `redis.call('DEL', KEYS[1])
redis.call('XADD', KEYS[2], 'MAXLEN', '~', ARGV[1], '*', 'k', ARGV[2], 't', 'tombstone')
return 1`,
  2,
)

/**
 * Extend lock TTL if the token still matches.
 * KEYS[1] = cache:lock:{key}
 * ARGV[1] = lock token  ARGV[2] = TTL (milliseconds)
 */
export const CACHE_EXTEND_LOCK = new LuaScript(
  `if redis.call('GET', KEYS[1]) == ARGV[1] then
  redis.call('PEXPIRE', KEYS[1], ARGV[2])
  return 1
end
return 0`,
  1,
)
