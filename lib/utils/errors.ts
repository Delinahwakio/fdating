import { NextResponse } from 'next/server'

/**
 * Custom application error class with status codes and error codes
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: any

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Predefined error types for common scenarios
 */
export const ErrorTypes = {
  // Authentication errors (401)
  UNAUTHORIZED: (message = 'Unauthorized access') => 
    new AppError(message, 401, 'UNAUTHORIZED'),
  
  // Authorization errors (403)
  FORBIDDEN: (message = 'Access forbidden') => 
    new AppError(message, 403, 'FORBIDDEN'),
  
  // Not found errors (404)
  NOT_FOUND: (resource = 'Resource', message?: string) => 
    new AppError(message || `${resource} not found`, 404, 'NOT_FOUND'),
  
  // Validation errors (400)
  VALIDATION_ERROR: (message = 'Validation failed', details?: any) => 
    new AppError(message, 400, 'VALIDATION_ERROR', details),
  
  // Conflict errors (409)
  CONFLICT: (message = 'Resource already exists') => 
    new AppError(message, 409, 'CONFLICT'),
  
  // Payment required (402)
  INSUFFICIENT_CREDITS: (message = 'Insufficient credits. Please purchase more credits to continue.') => 
    new AppError(message, 402, 'INSUFFICIENT_CREDITS'),
  
  // Rate limit errors (429)
  RATE_LIMIT_EXCEEDED: (message = 'Too many requests. Please try again later.') => 
    new AppError(message, 429, 'RATE_LIMIT_EXCEEDED'),
  
  // Internal server errors (500)
  INTERNAL_ERROR: (message = 'An unexpected error occurred') => 
    new AppError(message, 500, 'INTERNAL_ERROR'),
  
  // Database errors (500)
  DATABASE_ERROR: (message = 'Database operation failed') => 
    new AppError(message, 500, 'DATABASE_ERROR'),
}

/**
 * Maps PostgreSQL error codes to user-friendly messages
 */
const POSTGRES_ERROR_MAP: Record<string, { message: string; code: string; status: number }> = {
  '23505': {
    message: 'This resource already exists',
    code: 'DUPLICATE',
    status: 409
  },
  '23503': {
    message: 'Referenced resource not found',
    code: 'FOREIGN_KEY_VIOLATION',
    status: 404
  },
  '23502': {
    message: 'Required field is missing',
    code: 'NOT_NULL_VIOLATION',
    status: 400
  },
  '23514': {
    message: 'Invalid value provided',
    code: 'CHECK_VIOLATION',
    status: 400
  },
  '42P01': {
    message: 'Database table not found',
    code: 'UNDEFINED_TABLE',
    status: 500
  },
  '42703': {
    message: 'Database column not found',
    code: 'UNDEFINED_COLUMN',
    status: 500
  }
}

/**
 * Checks if an error is a Supabase/PostgreSQL error
 */
function isSupabaseError(error: any): error is { code: string; message: string; details?: string; hint?: string } {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
}

/**
 * Handles Supabase-specific errors and converts them to AppError
 */
function handleSupabaseError(error: any): AppError {
  if (!isSupabaseError(error)) {
    return ErrorTypes.DATABASE_ERROR('Database operation failed')
  }

  const pgError = POSTGRES_ERROR_MAP[error.code]
  
  if (pgError) {
    return new AppError(
      pgError.message,
      pgError.status,
      pgError.code,
      {
        originalMessage: error.message,
        details: error.details,
        hint: error.hint
      }
    )
  }

  // Unknown database error
  return new AppError(
    'Database operation failed',
    500,
    'DATABASE_ERROR',
    {
      code: error.code,
      message: error.message,
      details: error.details
    }
  )
}

/**
 * Central error handler for API routes
 * Converts various error types to standardized NextResponse
 */
export function errorHandler(error: unknown): NextResponse {
  // Log error for monitoring (in production, send to error tracking service)
  console.error('API Error:', {
    error,
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString()
  })

  // Handle AppError instances
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error.details && { details: error.details })
      },
      { status: error.statusCode }
    )
  }

  // Handle Supabase/PostgreSQL errors
  if (isSupabaseError(error)) {
    const appError = handleSupabaseError(error)
    return NextResponse.json(
      {
        error: appError.message,
        code: appError.code
      },
      { status: appError.statusCode }
    )
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: isDevelopment ? error.message : 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
        ...(isDevelopment && { stack: error.stack })
      },
      { status: 500 }
    )
  }

  // Handle unknown error types
  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    },
    { status: 500 }
  )
}

/**
 * Wraps an async API route handler with error handling
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return errorHandler(error)
    }
  }
}

/**
 * Validates that a user is authenticated
 */
export function assertAuthenticated(userId: string | null | undefined): asserts userId is string {
  if (!userId) {
    throw ErrorTypes.UNAUTHORIZED('You must be logged in to perform this action')
  }
}

/**
 * Validates that a resource exists
 */
export function assertExists<T>(
  resource: T | null | undefined,
  resourceName: string = 'Resource'
): asserts resource is T {
  if (!resource) {
    throw ErrorTypes.NOT_FOUND(resourceName)
  }
}

/**
 * Validates that a condition is true
 */
export function assert(condition: boolean, error: AppError): asserts condition {
  if (!condition) {
    throw error
  }
}
