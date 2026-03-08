/**
 * Distributed Rate Limiting with Upstash Redis
 *
 * Uses @upstash/ratelimit with a sliding window algorithm.
 * Works across serverless function instances (Vercel, etc.).
 *
 * Requires environment variables:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * If these are not set, this module exports null limiters
 * and the main rate-limit.ts will fall back to in-memory.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

/**
 * Whether Redis-based rate limiting is available.
 */
export const isRedisAvailable = !!(redisUrl && redisToken)

let redis: Redis | null = null

function getRedis(): Redis | null {
    if (!isRedisAvailable) return null
    if (!redis) {
        redis = new Redis({
            url: redisUrl!,
            token: redisToken!,
        })
    }
    return redis
}

/**
 * Rate limiter instances for each endpoint.
 * Returns null if Redis is not configured.
 */
export function getChatRateLimit(): Ratelimit | null {
    const r = getRedis()
    if (!r) return null
    return new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 requests per minute
        prefix: 'lis:rl:chat',
    })
}

export function getSttRateLimit(): Ratelimit | null {
    const r = getRedis()
    if (!r) return null
    return new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 requests per minute
        prefix: 'lis:rl:stt',
    })
}

export function getTtsRateLimit(): Ratelimit | null {
    const r = getRedis()
    if (!r) return null
    return new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 requests per minute
        prefix: 'lis:rl:tts',
    })
}

/**
 * Generic rate limit check using Upstash Redis.
 *
 * @param identifier - Unique identifier for the client (e.g., user ID or IP)
 * @param endpoint - The API endpoint path (e.g., '/api/chat')
 * @returns { allowed, remaining, resetTime } or null if Redis is unavailable
 */
export async function checkRedisRateLimit(
    identifier: string,
    endpoint: string
): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
} | null> {
    let limiter: Ratelimit | null = null

    switch (endpoint) {
        case '/api/chat':
            limiter = getChatRateLimit()
            break
        case '/api/stt':
            limiter = getSttRateLimit()
            break
        case '/api/tts':
            limiter = getTtsRateLimit()
            break
        default:
            limiter = getChatRateLimit() // fallback
    }

    if (!limiter) return null

    try {
        const result = await limiter.limit(identifier)
        return {
            allowed: result.success,
            remaining: result.remaining,
            resetTime: result.reset,
        }
    } catch (err) {
        console.error('[RateLimit] Redis error, falling back to in-memory:', err)
        return null // Signal to caller to use in-memory fallback
    }
}
