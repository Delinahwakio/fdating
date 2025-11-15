# Fantooo Database Setup Guide

This guide walks you through setting up the Fantooo database schema using Supabase.

## Prerequisites

- Supabase account (https://supabase.com)
- Supabase CLI installed (optional for local development)
- Node.js and npm installed

## Option 1: Using Supabase Dashboard (Recommended for Production)

### Step 1: Create a New Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in project details:
   - Name: `fantooo-platform`
   - Database Password: (generate a strong password)
   - Region: Choose closest to your users
4. Wait for project to be provisioned (~2 minutes)

### Step 2: Run Migrations

1. Navigate to the SQL Editor in your Supabase dashboard
2. Run each migration file in order:

**Migration 1: Initial Schema**
- Copy contents of `migrations/001_initial_schema.sql`
- Paste into SQL Editor
- Click "Run"
- Verify: Should see "Success. No rows returned"

**Migration 2: Indexes**
- Copy contents of `migrations/002_indexes.sql`
- Paste into SQL Editor
- Click "Run"
- Verify: Should see "Success. No rows returned"

**Migration 3: RLS Policies**
- Copy contents of `migrations/003_rls_policies.sql`
- Paste into SQL Editor
- Click "Run"
- Verify: Should see "Success. No rows returned"

**Migration 4: Functions**
- Copy contents of `migrations/004_functions.sql`
- Paste into SQL Editor
- Click "Run"
- Verify: Should see "Success. No rows returned"

### Step 3: Verify Setup

1. Copy contents of `migrations/verify.sql`
2. Paste into SQL Editor
3. Click "Run"
4. Review results - all checks should show "✓ PASS"

### Step 4: Get API Keys

1. Go to Project Settings > API
2. Copy the following values:
   - Project URL
   - `anon` public key
   - `service_role` secret key (keep this secure!)

### Step 5: Configure Environment Variables

Create `.env.local` in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Option 2: Using Supabase CLI (Recommended for Local Development)

### Step 1: Install Supabase CLI

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or using npm
npm install -g supabase
```

### Step 2: Initialize Supabase Locally

```bash
# Start local Supabase (requires Docker)
supabase init
supabase start

# This will output:
# - API URL: http://localhost:54321
# - DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# - Studio URL: http://localhost:54323
# - anon key: (local anon key)
# - service_role key: (local service role key)
```

### Step 3: Apply Migrations

```bash
# Apply all migrations
supabase db reset

# Or apply migrations one by one
supabase migration up
```

### Step 4: Verify Setup

```bash
# Open Supabase Studio
open http://localhost:54323

# Or run verification script
supabase db execute -f migrations/verify.sql
```

### Step 5: Link to Production (When Ready)

```bash
# Login to Supabase
supabase login

# Link to your production project
supabase link --project-ref your-project-ref

# Push migrations to production
supabase db push
```

## Creating Initial Admin User

After migrations are complete, you need to create an initial admin user:

### Using Supabase Dashboard

1. Go to Authentication > Users
2. Click "Add user"
3. Fill in:
   - Email: `admin@fantooo.com`
   - Password: (generate secure password)
   - Auto Confirm User: Yes
4. Copy the user ID
5. Go to SQL Editor and run:

```sql
-- Insert admin record
INSERT INTO admins (id, name, email, is_super_admin)
VALUES ('paste-user-id-here', 'Super Admin', 'admin@fantooo.com', true);
```

### Using SQL

```sql
-- Create auth user and admin in one transaction
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- This requires service role access
  -- Insert into auth.users (simplified - actual implementation may vary)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@fantooo.com',
    crypt('your-secure-password', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
  ) RETURNING id INTO v_user_id;

  -- Insert admin record
  INSERT INTO admins (id, name, email, is_super_admin)
  VALUES (v_user_id, 'Super Admin', 'admin@fantooo.com', true);
END $$;
```

## Testing the Setup

### Test 1: Verify Tables

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected: 11 tables (admins, chat_assignments, chats, favorites, fictional_users, messages, operator_activity, operator_stats, operators, real_users, transactions)

### Test 2: Verify RLS

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

Expected: All tables should have `rowsecurity = true`

### Test 3: Test Assignment Function

```sql
-- This should fail with "Operator not found" (expected)
SELECT assign_chat_to_operator('00000000-0000-0000-0000-000000000000');
```

### Test 4: Test Profile Function

```sql
-- This should fail with "User not found" (expected)
SELECT * FROM get_available_fictional_profiles('00000000-0000-0000-0000-000000000000');
```

## Common Issues and Solutions

### Issue: "relation does not exist"
**Solution:** Migrations not applied in correct order. Run migrations 001-004 in sequence.

### Issue: "permission denied for table"
**Solution:** RLS is enabled but you're not authenticated. Use service role key or authenticate first.

### Issue: "function does not exist"
**Solution:** Migration 004 not applied. Run `004_functions.sql`.

### Issue: "duplicate key value violates unique constraint"
**Solution:** Trying to insert duplicate data. Check UNIQUE constraints in schema.

### Issue: Local Supabase won't start
**Solution:** 
- Ensure Docker is running
- Check ports 54321-54323 are not in use
- Run `supabase stop` then `supabase start`

## Next Steps

After database setup is complete:

1. ✅ Database schema created
2. ✅ RLS policies enabled
3. ✅ Functions and triggers created
4. ✅ Initial admin user created
5. ⏭️ Configure environment variables in `.env.local`
6. ⏭️ Start Next.js development server
7. ⏭️ Create fictional profiles via admin panel
8. ⏭️ Create operator accounts
9. ⏭️ Test real user registration flow

## Backup and Restore

### Backup Database

```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Or using pg_dump
pg_dump -h db.your-project.supabase.co -U postgres -d postgres > backup.sql
```

### Restore Database

```bash
# Using Supabase CLI
supabase db reset
psql -h localhost -p 54322 -U postgres -d postgres -f backup.sql

# Or for production
psql -h db.your-project.supabase.co -U postgres -d postgres -f backup.sql
```

## Support

For issues with:
- **Supabase**: https://supabase.com/docs
- **Migrations**: Check `migrations/README.md`
- **Verification**: Run `migrations/verify.sql`

## Security Checklist

Before going to production:

- [ ] Change default admin password
- [ ] Rotate service role key if exposed
- [ ] Enable 2FA on Supabase account
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Review RLS policies
- [ ] Test authentication flows
- [ ] Enable audit logging
- [ ] Set up monitoring and alerts
- [ ] Document emergency procedures
