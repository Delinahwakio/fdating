# Database Migration Guide

This guide explains how to deploy and manage database migrations for the Fantooo platform.

## Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- Supabase project created
- Database credentials from Supabase Dashboard

## Migration Files

Migrations are located in `supabase/migrations/` and must be run in order:

1. **001_initial_schema.sql** - Core tables (users, chats, messages, etc.)
2. **002_indexes.sql** - Performance indexes
3. **003_rls_policies.sql** - Row Level Security policies
4. **004_functions.sql** - Database functions (assignment, reassignment, etc.)
5. **005_moderation_actions.sql** - Moderation logging table
6. **006_moderation_rls.sql** - RLS policies for moderation
7. **007_platform_configuration.sql** - Platform settings table
8. **008_storage_buckets.sql** - Storage buckets for profile pictures

## Deployment Methods

### Method 1: Automated Script (Recommended)

**Linux/Mac:**
```bash
npm run db:deploy
```

**Windows:**
```bash
npm run db:deploy:win
```

This script will:
1. Check if Supabase CLI is installed
2. Link to your project (if not already linked)
3. Show current migration status
4. Deploy all pending migrations
5. Run verification checks

### Method 2: Supabase CLI

```bash
# Link to your project (first time only)
supabase link --project-ref YOUR_PROJECT_REF

# Check migration status
supabase migration list

# Deploy all pending migrations
supabase db push

# Verify deployment
npm run db:verify
```

### Method 3: Manual SQL Execution

If you prefer to run migrations manually:

1. Go to Supabase Dashboard → SQL Editor
2. Open each migration file in order
3. Copy and paste the SQL
4. Click "Run" for each migration
5. Verify with `verify.sql`

## Verification

After deploying migrations, verify the setup:

**Linux/Mac:**
```bash
npm run db:verify
```

**Windows:**
```bash
npm run db:verify:win
```

This will check:
- All tables are created
- All indexes exist
- RLS policies are enabled
- Database functions are created

### Manual Verification Checklist

- [ ] All tables exist in `public` schema
- [ ] RLS is enabled on all tables
- [ ] All indexes are created
- [ ] Database functions work correctly
- [ ] Realtime is enabled for required tables
- [ ] Connection pooling is configured

## Post-Migration Setup

### 1. Enable Realtime

Go to Supabase Dashboard → Database → Replication

Enable replication for these tables:
- `messages`
- `chats`
- `operator_stats`
- `operator_activity`

### 2. Set Up Connection Pooling

1. Go to Settings → Database
2. Find "Connection Pooling" section
3. Copy the pooling URL (uses port 6543)
4. Add to environment variables as `SUPABASE_POOLING_URL`

### 3. Create Initial Admin Account

Run this SQL in SQL Editor:

```sql
-- Create admin user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@fantooo.com',
  crypt('your-secure-password', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- Add to admins table
INSERT INTO admins (id, name, email, is_super_admin)
SELECT id, 'Admin', 'admin@fantooo.com', true
FROM auth.users
WHERE email = 'admin@fantooo.com';
```

### 4. Create Test Operator (Optional)

```sql
-- Create operator user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'operator@fantooo.com',
  crypt('your-secure-password', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- Add to operators table
INSERT INTO operators (id, name, email, is_active)
SELECT id, 'Test Operator', 'operator@fantooo.com', true
FROM auth.users
WHERE email = 'operator@fantooo.com';
```

### 5. Insert Platform Configuration

```sql
-- Insert default platform configuration
INSERT INTO platform_config (
  idle_timeout_minutes,
  max_reassignments,
  free_message_count,
  credit_price_kes,
  maintenance_mode
) VALUES (
  5,    -- 5 minutes idle timeout
  3,    -- Max 3 reassignments
  3,    -- First 3 messages free
  10,   -- 10 KES per credit
  false -- Maintenance mode off
);
```

## Testing Database Functions

### Test Chat Assignment

```sql
-- Create a test chat
INSERT INTO chats (real_user_id, fictional_user_id)
VALUES (
  (SELECT id FROM real_users LIMIT 1),
  (SELECT id FROM fictional_users LIMIT 1)
);

-- Test assignment function
SELECT assign_chat_to_operator(
  (SELECT id FROM operators WHERE is_active = true LIMIT 1)
);

-- Verify assignment
SELECT * FROM chats WHERE assigned_operator_id IS NOT NULL;
```

### Test Idle Detection

```sql
-- Simulate idle chat (5+ minutes old)
UPDATE chats
SET assignment_time = NOW() - INTERVAL '6 minutes'
WHERE id = 'your-chat-id';

-- Test reassignment function
SELECT release_and_reassign_chat(
  'your-chat-id',
  'idle_timeout'
);

-- Verify reassignment
SELECT * FROM chat_assignments WHERE chat_id = 'your-chat-id';
```

### Test Fictional Profile Filtering

```sql
-- Test gender filtering
SELECT * FROM get_available_fictional_profiles('male');
SELECT * FROM get_available_fictional_profiles('female');
```

## Rollback Procedure

If you need to rollback migrations:

### Using Supabase CLI

```bash
# View migration history
supabase migration list

# Rollback to specific migration
supabase db reset --version 20231201000000
```

### Manual Rollback

Create a rollback script for each migration:

```sql
-- Example: Rollback 007_platform_configuration.sql
DROP TABLE IF EXISTS platform_config;
```

## Common Issues

### Issue: "relation already exists"

**Cause**: Migration was partially applied

**Solution**:
```sql
-- Check what exists
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Drop problematic table and re-run migration
DROP TABLE IF EXISTS table_name CASCADE;
```

### Issue: "permission denied"

**Cause**: Using anon key instead of service role key

**Solution**: Ensure you're using the service role key for migrations

### Issue: RLS policies blocking queries

**Cause**: RLS enabled but policies not applied correctly

**Solution**:
```sql
-- Temporarily disable RLS for debugging
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- Re-enable after fixing policies
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Issue: Function not found

**Cause**: Functions not created or wrong schema

**Solution**:
```sql
-- Check if function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Re-run 004_functions.sql
```

## Migration Best Practices

1. **Always backup before migrations**
   ```bash
   supabase db dump -f backup-$(date +%Y%m%d).sql
   ```

2. **Test migrations locally first**
   ```bash
   supabase start
   supabase db reset
   supabase db push
   ```

3. **Run migrations during low-traffic periods**

4. **Monitor for errors during deployment**
   - Check Supabase Dashboard → Logs
   - Watch for failed queries

5. **Verify after each migration**
   ```bash
   npm run db:verify
   ```

6. **Document any manual changes**
   - Keep track of SQL run outside migrations
   - Create new migration files for changes

## Monitoring

After deployment, monitor:

1. **Query Performance**
   - Go to Supabase Dashboard → Reports
   - Check slow queries (>1s)
   - Add indexes if needed

2. **Connection Pool Usage**
   - Monitor active connections
   - Adjust pool size if needed

3. **RLS Policy Performance**
   - Check if policies are causing slow queries
   - Optimize policies if needed

## Getting Help

If you encounter issues:

1. Check Supabase logs in Dashboard
2. Review migration files for syntax errors
3. Verify environment variables are correct
4. Check Supabase status page
5. Consult Supabase documentation

## Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
