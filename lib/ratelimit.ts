import { getRedis } from '@/lib/redis'

/**
 * Minimal fixed-window rate limiter built on the existing Upstash Redis
 * client (no @upstash/ratelimit dependency). Returns true if the caller is
 * within budget for this window; increments as a side effect.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const redis = getRedis()
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, windowSeconds)
    return count <= limit
  } catch {
    // Redis unavailable — fail open rather than blocking legitimate users.
    return true
  }
}
