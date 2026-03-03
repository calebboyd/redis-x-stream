import type { RedisClient } from '../types.js'
import { createClient } from '../redis.js'
import { resolveCodec } from './codec.js'
import { encodeJob } from './job.js'
import type { Codec, QueueOptions } from './types.js'

export class Queue<T> {
  private readonly client: RedisClient
  private readonly created: boolean
  private readonly name: string
  private readonly codecReady: Promise<Codec>

  constructor(name: string, options: QueueOptions = {}) {
    this.name = name
    const { client, created } = createClient(options.redis)
    this.client = client
    this.created = created
    this.codecReady = resolveCodec(options.codec)
  }

  public async add(data: T): Promise<string> {
    const codec = await this.codecReady
    const [dataBuffer, metaBuffer] = encodeJob(data, this.baseMeta(), codec)
    const id = await this.client.xadd(this.name, '*', 'd', dataBuffer, 'm', metaBuffer)
    if (!id) throw new Error('Unable to add job')
    return id
  }

  public async addBulk(data: T[]): Promise<string[]> {
    if (data.length === 0) return []
    const codec = await this.codecReady
    const pipeline = this.client.pipeline()
    for (const item of data) {
      const [dataBuffer, metaBuffer] = encodeJob(item, this.baseMeta(), codec)
      pipeline.xadd(this.name, '*', 'd', dataBuffer, 'm', metaBuffer)
    }
    const results = await pipeline.exec()
    if (!results) return []
    return results.map(([error, id]) => {
      if (error) throw error
      if (!id) throw new Error('Unable to add job')
      return id as string
    })
  }

  public async close(): Promise<void> {
    if (!this.created) return
    await Promise.all([
      new Promise((resolve) => this.client.once('end', resolve)),
      this.client.quit(),
    ])
  }

  private baseMeta() {
    return {
      attempt: 0,
      createdAt: Date.now(),
    }
  }
}
