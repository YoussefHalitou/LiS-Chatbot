/**
 * Rate limiting middleware
 *
 * Uses Upstash Redis when available (production) for distributed rate limiting.
 * Falls back to in-memory store when Redis is not configured (local dev).
 */

import { checkRedisRateLimit, isRedisAvailable } from './rate-limit-redis'

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (in production, use Redis or similar)
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

// Default rate limits
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/chat': { maxRequests: 60, windowMs: 60000 }, // 60 requests per minute
  '/api/stt': { maxRequests: 30, windowMs: 60000 }, // 30 requests per minute
  '/api/tts': { maxRequests: 30, windowMs: 60000 }, // 30 requests per minute
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  allowed: boolean
  remaining: number
  resetTime: number
} {
  const now = Date.now()
  const key = identifier
  const entry = rateLimitStore.get(key)

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to clean up
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k)
      }
    }
  }

  if (!entry || entry.resetTime < now) {
    // Create new entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(key, newEntry)
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
    }
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(req: Request): string {
  // Try to get IP address from various headers
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'

  // In production, you might want to use user ID or session ID
  return ip
}

/**
 * Rate limit middleware for Next.js API routes
 */
/**
 * Rate limit middleware for Next.js API routes.
 *
 * Tries Redis first (distributed, works across serverless instances).
 * Falls back to in-memory if Redis is unavailable.
 */
export async function rateLimitMiddleware(
  req: Request,
  endpoint: string,
  userId?: string | null
): Promise<{
  allowed: boolean
  response?: Response
}> {
  const identifier = userId || getClientIdentifier(req)

  // Try Redis-based rate limiting first
  if (isRedisAvailable) {
    const redisResult = await checkRedisRateLimit(identifier, endpoint)
    if (redisResult) {
      if (!redisResult.allowed) {
        const resetSeconds = Math.ceil((redisResult.resetTime - Date.now()) / 1000)
        return {
          allowed: false,
          response: new Response(
            JSON.stringify({
              error: 'Zu viele Anfragen. Bitte warte einen Moment.',
              retryAfter: resetSeconds,
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': resetSeconds.toString(),
                'X-RateLimit-Limit': String(redisResult.remaining + 1),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': redisResult.resetTime.toString(),
              },
            }
          ),
        }
      }
      return { allowed: true }
    }
    // Redis returned null (error) — fall through to in-memory
  }

  // Fallback: in-memory rate limiting
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS['/api/chat']
  const result = checkRateLimit(identifier, config)

  if (!result.allowed) {
    const resetSeconds = Math.ceil((result.resetTime - Date.now()) / 1000)
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: 'Zu viele Anfragen. Bitte warte einen Moment.',
          retryAfter: resetSeconds,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': resetSeconds.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetTime.toString(),
          },
        }
      ),
    }
  }

  return { allowed: true }
}

