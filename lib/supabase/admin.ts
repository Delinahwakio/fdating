import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

/**
 * Admin client for server-side operations with connection pooling
 * Uses service role key for elevated permissions
 * Configured with connection pooling for optimal performance
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Use connection pooling URL if available (port 6543)
  // This provides better performance for server-side operations
  const poolingUrl = process.env.SUPABASE_POOLING_URL || supabaseUrl

  return createClient<Database>(poolingUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-connection-pool': 'true',
      },
    },
  })
}
