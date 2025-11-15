/**
 * API logging middleware
 * Logs all API requests and responses with timing
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

export interface ApiLogContext {
  method: string
  path: string
  status?: number
  duration?: number
  userId?: string
  error?: string
}

/**
 * Wrap an API route handler with logging
 */
export function withApiLogging(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    const method = request.method
    const path = new URL(request.url).pathname

    // Generate request ID
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Log request
    logger.apiRequest(method, path, { requestId })

    try {
      // Execute handler
      const response = await handler(request)
      
      // Calculate duration
      const duration = Date.now() - startTime
      
      // Log response
      logger.apiResponse(method, path, response.status, duration, { requestId })

      // Add request ID to response headers
      response.headers.set('X-Request-ID', requestId)

      return response

    } catch (error) {
      const duration = Date.now() - startTime
      
      // Log error
      logger.error(
        `API Error: ${method} ${path}`,
        error instanceof Error ? error : new Error(String(error)),
        { requestId, duration }
      )

      // Return error response
      return NextResponse.json(
        { 
          error: 'Internal server error',
          requestId 
        },
        { 
          status: 500,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }
  }
}

/**
 * Extract user ID from request (if authenticated)
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | undefined> {
  try {
    // This is a placeholder - implement based on your auth system
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return undefined

    // Extract user ID from token or session
    // Implementation depends on your auth setup
    return undefined
  } catch {
    return undefined
  }
}
