import { NextRequest } from 'next/server'
import { ErrorTypes } from './errors'

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  interval: number // Time window in milliseconds
  maxRequests: number // Maximum requests allowed in the interval
}

/**
 * Rate limit store entry
 */
interface RateLimitEntry {
  count: number
  resetTime: number
}

/**
 * In-memory rate limit store
 * In production, replace with Redis for distributed rate limiting
 */
class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      const entries = Array.from(this.store.entries())
      for (const [key, entry] of entries) {
        if (entry.resetTime < now) {
          this.store.delete(key)
        }
      }
    }, 60000)
  }

  check(key: string, config: RateLimitConfig): { success: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const entry = this.store.get(key)

    // No entry or expired entry
    if (!entry || entry.resetTime < now) {
      const resetTime = now + config.interval
      this.store.set(key, { count: 1, resetTime })
      return {
        success: true,
        remaining: config.maxRequests - 1,
        resetTime
      }
    }

    // Entry exists and not expired
    if (entry.count >= config.maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetTime: entry.resetTime
      }
    }

    // Increment count
    entry.count++
    this.store.set(key, entry)

    return {
      success: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    }
  }

  reset(key: string): void {
    this.store.delete(key)
  }

  cleanup(): void {
    clearInterval(this.cleanupInterval)
    this.store.clear()
  }
}

// Global rate limit store instance
const rateLimitStore = new RateLimitStore()

/**
 * Rate limit configurations for different endpoint types
 */
export const RateLimitConfigs = {
  // Authentication endpoints: 5 attempts per 15 minutes
  AUTH: {
    interval: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5
  },
  
  // Message sending: 30 per minute
  MESSAGE: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 30
  },
  
  // General API: 100 requests per minute
  API: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 100
  },
  
  // Strict rate limit for sensitive operations: 10 per minute
  STRICT: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 10
  }
}

/**
 * Gets client identifier from request (IP address or user ID)
 */
function getClientIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }
  
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'
  
  return `ip:${ip}`
}

/**
 * Checks rate limit for a request
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): { success: boolean; remaining: number; resetTime: number } {
  const identifier = getClientIdentifier(request, userId)
  const key = `ratelimit:${identifier}`
  
  return rateLimitStore.check(key, config)
}

/**
 * Middleware wrapper for rate limiting
 * Throws AppError if rate limit exceeded
 */
export async function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): Promise<void> {
  const result = checkRateLimit(request, config, userId)
  
  if (!result.success) {
    const resetDate = new Date(result.resetTime)
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
    
    throw ErrorTypes.RATE_LIMIT_EXCEEDED(
      `Too many requests. Please try again after ${retryAfter} seconds.`
    )
  }
}

/**
 * Rate limit decorator for API routes
 */
export function rateLimit(config: RateLimitConfig) {
  return function <T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<Response>
  ) {
    return async (request: NextRequest, ...args: T): Promise<Response> => {
      try {
        await withRateLimit(request, config)
        return await handler(request, ...args)
      } catch (error) {
        if (error instanceof Error && 'statusCode' in error) {
          const appError = error as any
          return new Response(
            JSON.stringify({
              error: appError.message,
              code: appError.code
            }),
            {
              status: appError.statusCode,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(Math.ceil((Date.now() - Date.now()) / 1000))
              }
            }
          )
        }
        throw error
      }
    }
  }
}

/**
 * Resets rate limit for a specific identifier
 * Useful for testing or manual intervention
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.reset(`ratelimit:${identifier}`)
}

/**
 * Cleans up rate limit store
 * Call this when shutting down the application
 */
export function cleanupRateLimitStore(): void {
  rateLimitStore.cleanup()
}

/**
 * Helper to add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: Response,
  result: { remaining: number; resetTime: number }
): Response {
  const headers = new Headers(response.headers)
  headers.set('X-RateLimit-Remaining', String(result.remaining))
  headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)))
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

/**
 * Example usage in API route:
 * 
 * export async function POST(request: NextRequest) {
 *   await withRateLimit(request, RateLimitConfigs.AUTH)
 *   // ... rest of handler
 * }
 * 
 * Or with decorator:
 * 
 * export const POST = rateLimit(RateLimitConfigs.AUTH)(async (request: NextRequest) => {
 *   // ... handler logic
 * })
 */
