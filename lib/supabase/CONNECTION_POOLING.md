# Supabase Connection Pooling Configuration

## Overview

This application uses Supabase connection pooling to optimize database performance and handle concurrent connections efficiently. Connection pooling is configured with a maximum of 20 concurrent connections.

## Architecture

### Client Types

1. **Browser Client** (`lib/supabase/client.ts`)
   - Used for client-side operations
   - Uses anon key for RLS-protected queries
   - No connection pooling needed (handled by browser)

2. **Server Client** (`lib/supabase/server.ts`)
   - Used for server components with cookie-based auth
   - Uses anon key with user context
   - Configured with connection pooling headers

3. **Admin Client** (`lib/supabase/admin.ts`)
   - Used for server-side operations requiring elevated permissions
   - Uses service role key (bypasses RLS)
   - Configured with dedicated pooling URL

## Connection Pooling URL

Supabase provides a connection pooling endpoint on port 6543:

```
Standard URL:  https://[project-ref].supabase.co
Pooling URL:   https://[project-ref].pooler.supabase.com
```

### Benefits

- **Better Performance**: Reuses existing connections instead of creating new ones
- **Resource Efficiency**: Limits concurrent connections to prevent database overload
- **Reduced Latency**: Eliminates connection establishment overhead
- **Scalability**: Handles more concurrent requests with fewer resources

## Configuration

### Environment Variables

Add to your `.env.local`:

```env
# Standard Supabase URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Anon key for client-side operations
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Service role key for admin operations
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Connection pooling URL (recommended for production)
SUPABASE_POOLING_URL=https://your-project.pooler.supabase.com
```

### Client Configuration

The admin client automatically uses the pooling URL if available:

```typescript
import { createAdminClient } from '@/lib/supabase/admin'

// In API routes or server actions
const supabase = createAdminClient()
const { data } = await supabase.from('users').select('*')
```

## Connection Limits

- **Maximum Concurrent Connections**: 20
- **Connection Timeout**: 30 seconds
- **Idle Connection Timeout**: 10 minutes

These limits are enforced by Supabase's connection pooler (PgBouncer).

## Best Practices

### 1. Use Appropriate Client

```typescript
// ✅ Client-side: Use browser client
import { createClient } from '@/lib/supabase/client'

// ✅ Server-side with auth: Use server client
import { createClient } from '@/lib/supabase/server'

// ✅ Server-side admin operations: Use admin client
import { createAdminClient } from '@/lib/supabase/admin'
```

### 2. Close Connections Properly

```typescript
// Connections are automatically managed by Supabase client
// No manual cleanup needed
```

### 3. Avoid Long-Running Transactions

```typescript
// ❌ Bad: Long transaction holds connection
const { data } = await supabase.rpc('long_running_function')

// ✅ Good: Break into smaller operations
const { data: step1 } = await supabase.rpc('step_1')
const { data: step2 } = await supabase.rpc('step_2')
```

### 4. Use Prepared Statements

```typescript
// ✅ Supabase automatically uses prepared statements
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId) // Parameterized query
```

## Monitoring

### Check Connection Usage

In Supabase Dashboard:
1. Go to Database → Connection Pooling
2. Monitor active connections
3. Check for connection pool exhaustion

### Common Issues

#### Connection Pool Exhausted

**Symptom**: `remaining connection slots reserved for non-replication superuser connections`

**Solution**:
- Increase connection pool size in Supabase settings
- Optimize queries to reduce connection time
- Implement query result caching

#### Slow Queries

**Symptom**: Queries taking longer than expected

**Solution**:
- Add database indexes (see `supabase/migrations/002_indexes.sql`)
- Use query result caching (see `lib/utils/cache.ts`)
- Optimize query structure

## Production Considerations

### Vercel Deployment

Vercel serverless functions create new connections per invocation. Connection pooling is essential:

```typescript
// Each API route invocation reuses pooled connections
export async function GET(request: Request) {
  const supabase = createAdminClient() // Uses pooled connection
  const { data } = await supabase.from('users').select('*')
  return Response.json(data)
}
```

### Edge Functions

For Supabase Edge Functions, use the built-in client:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  // Connection pooling handled automatically
})
```

## Testing

Connection pooling is transparent to application code. Test normally:

```typescript
// Tests work the same way
const supabase = createAdminClient()
const { data } = await supabase.from('users').select('*')
expect(data).toBeDefined()
```

## References

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [PgBouncer Documentation](https://www.pgbouncer.org/)
- [PostgreSQL Connection Management](https://www.postgresql.org/docs/current/runtime-config-connection.html)
