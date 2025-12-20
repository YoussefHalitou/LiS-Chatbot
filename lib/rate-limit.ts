import { NextRequest } from 'next/server'

interface RateLimitOptions {
  /** Maximum number of requests within the window. */
  limit: number
  /** Rolling window size in milliseconds. */
  windowMs: number
  /** Optional scope to isolate counters per route */
  segment?: string
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  reset: number
  identifier: string
  limit: number
}

const counters = new Map<string, { count: number; expiresAt: number }>()

function getClientIdentifier(req: NextRequest) {
  return (
    req.ip ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Very small in-memory sliding window rate limiter suitable for single-instance deployments.
 */
export function checkRateLimit(
  req: NextRequest,
  { limit, windowMs, segment = 'global' }: RateLimitOptions
): RateLimitResult {
  const clientId = getClientIdentifier(req)
  const key = `${segment}:${clientId}`
  const now = Date.now()
  const existing = counters.get(key)

  if (!existing || existing.expiresAt <= now) {
    const expiresAt = now + windowMs
    counters.set(key, { count: 1, expiresAt })
    return {
      allowed: true,
      remaining: limit - 1,
      reset: expiresAt,
      identifier: clientId,
      limit,
    }
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      reset: existing.expiresAt,
      identifier: clientId,
      limit,
    }
  }

  existing.count += 1
  counters.set(key, existing)
  return {
    allowed: true,
    remaining: limit - existing.count,
    reset: existing.expiresAt,
    identifier: clientId,
    limit,
  }
}
