// Fixed-window limiter held in memory. Counts are per server instance and reset
// on cold starts, so this is best-effort: the real limit across a deployment is
// `limit` multiplied by the number of live instances.

type Bucket = { count: number; resetAt: number }

const MAX_BUCKETS = 10_000
const buckets = new Map<string, Bucket>()

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k)
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  bucket.count += 1
  return bucket.count > limit
}
