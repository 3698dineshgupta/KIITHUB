import { Redis } from '@upstash/redis'

let _redis: Redis | null = null

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return _redis
}

const TTL = parseInt(process.env.CACHE_TTL ?? '86400')

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try { return await getRedis().get<T>(key) } catch { return null }
  },
  async set(key: string, value: unknown, ttl = TTL): Promise<void> {
    try { await getRedis().set(key, value, { ex: ttl }) } catch {}
  },
  async del(key: string): Promise<void> {
    try { await getRedis().del(key) } catch {}
  },
  async incr(key: string): Promise<number> {
    try { return await getRedis().incr(key) } catch { return 0 }
  },
}

// Cache key factories
export const CACHE_KEYS = {
  telegramUrl: (fileId: string) => `tg:url:${fileId}`,
  pdfBytes: (fileId: string) => `pdf:bytes:${fileId}`,
  noteDetail: (id: string) => `note:${id}`,
  pyqDetail: (id: string) => `pyq:${id}`,
  userPermission: (userId: string) => `perm:${userId}`,
  popularNotes: () => `popular:notes`,
  trendingNotes: () => `trending:notes`,
  settings: () => `app:settings`,
  suggestions: (type: 'note' | 'pyq', id: string) => `suggest:${type}:${id}`,
}
