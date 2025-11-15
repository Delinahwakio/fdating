# Utility Functions

This directory contains utility functions for error handling, validation, rate limiting, and other common operations.

## Error Handling (`errors.ts`)

### AppError Class

Custom error class with status codes and error codes for consistent error handling across the application.

```typescript
import { AppError, ErrorTypes } from '@/lib/utils/errors'

// Throw predefined errors
throw ErrorTypes.UNAUTHORIZED()
throw ErrorTypes.NOT_FOUND('User')
throw ErrorTypes.VALIDATION_ERROR('Invalid email format')
throw ErrorTypes.INSUFFICIENT_CREDITS()

// Create custom errors
throw new AppError('Custom error message', 400, 'CUSTOM_ERROR_CODE')
```

### Error Handler

Central error handler for API routes that converts various error types to standardized NextResponse.

```typescript
import { errorHandler } from '@/lib/utils/errors'

export async function POST(request: NextRequest) {
  try {
    // Your route logic
  } catch (error) {
    return errorHandler(error)
  }
}
```

### Assertion Helpers

```typescript
import { assertAuthenticated, assertExists, assert } from '@/lib/utils/errors'

// Assert user is authenticated
assertAuthenticated(user?.id)

// Assert resource exists
assertExists(chat, 'Chat')

// Assert custom condition
assert(user.credits > 0, ErrorTypes.INSUFFICIENT_CREDITS())
```

## Rate Limiting (`rateLimit.ts`)

### Rate Limit Configurations

Predefined rate limit configurations for different endpoint types:

- **AUTH**: 5 attempts per 15 minutes (for login/registration)
- **MESSAGE**: 30 requests per minute (for message sending)
- **API**: 100 requests per minute (general API endpoints)
- **STRICT**: 10 requests per minute (sensitive operations)

### Usage in API Routes

```typescript
import { withRateLimit, RateLimitConfigs } from '@/lib/utils/rateLimit'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    await withRateLimit(request, RateLimitConfigs.MESSAGE, userId)
    
    // Your route logic
  } catch (error) {
    return errorHandler(error)
  }
}
```

### Custom Rate Limits

```typescript
import { withRateLimit } from '@/lib/utils/rateLimit'

const customConfig = {
  interval: 60 * 1000, // 1 minute
  maxRequests: 50
}

await withRateLimit(request, customConfig, userId)
```

## Validation (`validation.ts`)

### Basic Validation Functions

```typescript
import { 
  validateEmail, 
  validateName, 
  validateAge,
  validateMessageContent,
  validatePassword 
} from '@/lib/utils/validation'

if (!validateEmail(email)) {
  throw ErrorTypes.VALIDATION_ERROR('Invalid email format')
}

if (!validateAge(age)) {
  throw ErrorTypes.VALIDATION_ERROR('Age must be between 18 and 100')
}
```

### Detailed Validation (with error messages)

```typescript
import { 
  validateEmailDetailed,
  validateNameDetailed,
  validateAgeDetailed 
} from '@/lib/utils/validation'

const emailValidation = validateEmailDetailed(email)
if (!emailValidation.isValid) {
  throw ErrorTypes.VALIDATION_ERROR(emailValidation.error)
}
```

### Input Sanitization

```typescript
import { sanitizeInput, sanitizeHtml, validateAndSanitizeMessage } from '@/lib/utils/validation'

// Remove XSS characters
const clean = sanitizeInput(userInput)

// Sanitize HTML content
const cleanHtml = sanitizeHtml(htmlContent)

// Validate and sanitize message in one step
const result = validateAndSanitizeMessage(messageContent)
if (!result.isValid) {
  throw ErrorTypes.VALIDATION_ERROR(result.error)
}
const sanitizedMessage = result.sanitized
```

### Batch Validation

```typescript
import { validateUserRegistration } from '@/lib/utils/validation'

const errors = validateUserRegistration({
  name: 'john_doe',
  displayName: 'John Doe',
  location: 'Nairobi',
  gender: 'male',
  lookingFor: 'female',
  age: 25,
  password: 'SecurePass123'
})

if (errors.length > 0) {
  throw ErrorTypes.VALIDATION_ERROR(errors.join(', '))
}
```

## Complete API Route Example

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRateLimit, RateLimitConfigs } from '@/lib/utils/rateLimit'
import { errorHandler, ErrorTypes, assertExists } from '@/lib/utils/errors'
import { validateAndSanitizeMessage } from '@/lib/utils/validation'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw ErrorTypes.UNAUTHORIZED()
    }

    // Apply rate limiting
    await withRateLimit(request, RateLimitConfigs.MESSAGE, user.id)

    // Parse and validate input
    const { content } = await request.json()
    const validation = validateAndSanitizeMessage(content)
    if (!validation.isValid) {
      throw ErrorTypes.VALIDATION_ERROR(validation.error!)
    }

    // Fetch resource
    const { data: resource, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', resourceId)
      .single()

    if (error) {
      throw ErrorTypes.DATABASE_ERROR('Failed to fetch resource')
    }
    
    assertExists(resource, 'Resource')

    // Your business logic here
    
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return errorHandler(error)
  }
}
```

## Production Considerations

### Rate Limiting

The current implementation uses in-memory storage for rate limiting. For production deployments with multiple instances, consider using Redis:

```typescript
// Install: npm install @upstash/ratelimit @upstash/redis

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
})

export const messageRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  analytics: true
})
```

### Error Monitoring

In production, integrate with an error monitoring service:

```typescript
// In errorHandler function
if (process.env.NODE_ENV === 'production') {
  // Example with Sentry
  Sentry.captureException(error, {
    contexts: {
      request: {
        url: request.url,
        method: request.method
      }
    }
  })
}
```

### Logging

Consider using a structured logging library for better observability:

```typescript
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
})

logger.error({ error, userId, endpoint }, 'API error occurred')
```
