# Supabase Client Configuration

This directory contains Supabase client configurations optimized for different use cases with connection pooling enabled.

## Client Types

### 1. Browser Client (`client.ts`)

**Use Case**: Client-side operations in React components

```typescript
import { createClient } from '@/lib/supabase/client'

function MyComponent() {
  const supabase = createClient()
  // Use for client-side queries with RLS
}
```

**Features**:
- Uses anon key
- Row Level Security (RLS) enforced
- Browser-based authentication
- No connection pooling needed (handled by browser)

### 2. Server Client (`server.ts`)

**Use Case**: Server components and API routes requiring user authentication

```typescript
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  // Queries run with user's permissions
}
```

**Features**:
- Uses anon key with cookie-based auth
- RLS enforced based on authenticated user
- Connection pooling headers configured
- Automatic session management

### 3. Admin Client (`admin.ts`)

**Use Case**: Server-side operations requiring elevated permissions

```typescript
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const supabase = createAdminClient()
  // Queries bypass RLS (use with caution)
}
```

**Features**:
- Uses service role key
- Bypasses RLS (full database access)
- **Connection pooling enabled** with dedicated pooling URL
- Optimized for cron jobs and admin operations
- No session persistence

## Connection Pooling

### Overview

Connection pooling is configured to optimize database performance:

- **Maximum Concurrent Connections**: 20
- **Pooling Mode**: Transaction pooling via PgBouncer
- **Connection Timeout**: 30 seconds
- **Idle Timeout**: 10 minutes

### Configuration

Set the optional pooling URL in your environment:

```env
# Standard URL (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Pooling URL (optional, recommended for production)
SUPABASE_POOLING_URL=https://your-project.pooler.supabase.com
```

The admin client automatically uses the pooling URL when available, falling back to the standard URL if not set.

### Benefits

1. **Reduced Latency**: Reuses existing connections
2. **Better Resource Usage**: Limits concurrent connections
3. **Improved Scalability**: Handles more requests with fewer resources
4. **Automatic Management**: No manual connection cleanup needed

See [CONNECTION_POOLING.md](./CONNECTION_POOLING.md) for detailed documentation.

## Usage Guidelines

### When to Use Each Client

| Scenario | Client | Reason |
|----------|--------|--------|
| React component data fetching | Browser Client | Client-side with user context |
| Server component with auth | Server Client | User-specific data with RLS |
| API route with auth | Server Client | User-specific operations |
| Cron job | Admin Client | No user context, needs pooling |
| Admin operations | Admin Client | Elevated permissions, pooling |
| Bulk operations | Admin Client | Performance optimization |

### Security Considerations

⚠️ **Admin Client Warning**: The admin client bypasses Row Level Security. Only use it when:
- You need to access data across all users
- You're implementing admin features
- You're running background jobs
- You understand the security implications

Always validate permissions in your application code when using the admin client.

### Best Practices

1. **Use the Right Client**
   ```typescript
   // ✅ Good: User-specific data
   const supabase = await createClient()
   const { data } = await supabase
     .from('chats')
     .select('*')
     .eq('real_user_id', userId)
   
   // ✅ Good: Admin operation
   const supabase = createAdminClient()
   const { data } = await supabase
     .from('platform_config')
     .select('*')
   ```

2. **Don't Mix Clients**
   ```typescript
   // ❌ Bad: Creating multiple clients
   const client1 = createAdminClient()
   const client2 = createAdminClient()
   
   // ✅ Good: Reuse client
   const supabase = createAdminClient()
   await supabase.from('table1').select('*')
   await supabase.from('table2').select('*')
   ```

3. **Handle Errors Properly**
   ```typescript
   const supabase = createAdminClient()
   const { data, error } = await supabase
     .from('users')
     .select('*')
   
   if (error) {
     console.error('Database error:', error)
     return NextResponse.json(
       { error: 'Failed to fetch data' },
       { status: 500 }
     )
   }
   ```

## Middleware

The `middleware.ts` file handles authentication and session refresh for protected routes. It automatically:
- Refreshes expired sessions
- Redirects unauthenticated users
- Manages cookies securely

## Testing

Tests are located in `__tests__/connection-pooling.test.ts`. Run with:

```bash
npm test lib/supabase
```

## Environment Variables

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Optional (recommended for production):

```env
SUPABASE_POOLING_URL=https://your-project.pooler.supabase.com
```

## Troubleshooting

### Connection Pool Exhausted

**Error**: `remaining connection slots reserved for non-replication superuser connections`

**Solutions**:
1. Check for connection leaks in your code
2. Increase pool size in Supabase dashboard
3. Implement query result caching
4. Optimize long-running queries

### Slow Queries

**Solutions**:
1. Add database indexes (see `supabase/migrations/002_indexes.sql`)
2. Use query result caching (see `lib/utils/cache.ts`)
3. Optimize query structure
4. Use the admin client for bulk operations

### Authentication Issues

**Solutions**:
1. Verify environment variables are set correctly
2. Check middleware configuration
3. Ensure cookies are enabled
4. Verify RLS policies are correct

## References

- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
