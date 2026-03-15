import { describe, expect, it } from 'vitest'
import { Queue } from './queue.js'
import { delay } from '../test.util.spec.js'

describe('queue', () => {
  it('close() resolves promptly when a created client never connects', async () => {
    const queue = new Queue('queue-close-' + Date.now(), {
      redis: 'redis://127.0.0.1:6739',
    })

    const result = await Promise.race([
      queue.close().then(() => 'closed'),
      delay(1000).then(() => 'timeout'),
    ])

    expect(result).toBe('closed')
  })
})
