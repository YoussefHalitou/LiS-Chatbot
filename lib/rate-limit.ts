/**
 * Simple in-memory rate limiting
 * Note: For production, use a proper rate limiting service like Redis or Upstash
 */

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
export function rateLimitMiddleware(
  req: Request,
  endpoint: string
): {
  allowed: boolean
  response?: Response
} {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS['/api/chat']
  const identifier = getClientIdentifier(req)
  const result = checkRateLimit(identifier, config)

  if (!result.allowed) {
    const resetSeconds = Math.ceil((result.resetTime - Date.now()) / 1000)
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please try again later.',
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

