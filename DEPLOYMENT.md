# Deployment Guide

This guide covers deploying the Fantooo platform to production using Vercel and Supabase.

## Prerequisites

- [ ] Vercel account ([sign up](https://vercel.com/signup))
- [ ] Supabase project created ([create project](https://app.supabase.com))
- [ ] Paystack account with live API keys ([sign up](https://paystack.com))
- [ ] Custom domain (optional but recommended)
- [ ] Git repository connected to Vercel

## Deployment Checklist

### 1. Supabase Setup

#### 1.1 Create Production Database

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or use existing one
3. Wait for database provisioning to complete
4. Note down your project credentials:
   - Project URL
   - Anon/Public Key
   - Service Role Key

#### 1.2 Run Database Migrations

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run all migrations
supabase db push

# Verify migrations
supabase db diff
```

Alternatively, run migrations manually in the SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Run each migration file in order:
   - `001_initial_schema.sql`
   - `002_indexes.sql`
   - `003_rls_policies.sql`
   - `004_functions.sql`
   - `005_moderation_actions.sql`
   - `006_moderation_rls.sql`
   - `007_platform_configuration.sql`

#### 1.3 Verify Database Setup

Run the verification script in SQL Editor:

```bash
# Copy content from supabase/migrations/verify.sql
# Paste and run in SQL Editor
```

Expected output:
- All tables created ✓
- All indexes created ✓
- All RLS policies active ✓
- All functions created ✓

#### 1.4 Configure Authentication

1. Go to Authentication → Settings
2. Set Site URL to your production domain
3. Add redirect URLs:
   - `https://your-domain.com/auth/callback`
   - `https://your-domain.com`
4. Configure email templates (optional)
5. Enable email confirmations (recommended)

#### 1.5 Enable Realtime

1. Go to Database → Replication
2. Enable replication for these tables:
   - `messages`
   - `chats`
   - `operator_stats`
   - `operator_activity`

#### 1.6 Set Up Connection Pooling

1. Go to Settings → Database
2. Copy the Connection Pooling URL
3. Save for environment variables (uses port 6543)

### 2. Paystack Setup

#### 2.1 Get Live API Keys

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to Settings → API Keys & Webhooks
3. Switch to "Live" mode
4. Copy your Live Public Key and Live Secret Key

#### 2.2 Configure Webhook

1. In Paystack Dashboard → Settings → API Keys & Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhooks/paystack`
3. Select events to listen for:
   - `charge.success`
4. Save webhook URL
5. Copy webhook secret (if provided)

### 3. Vercel Deployment

#### 3.1 Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your Git repository
4. Select the repository and click "Import"

#### 3.2 Configure Build Settings

Vercel should auto-detect Next.js. Verify these settings:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

#### 3.3 Set Environment Variables

Add all environment variables from `.env.local.example`:

**Supabase Variables**:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_POOLING_URL=https://xxxxx.pooler.supabase.com
```

**Paystack Variables** (use LIVE keys):
```
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
PAYSTACK_SECRET_KEY=sk_live_xxxxx
```

**Security Variables**:
```
CRON_SECRET=<generate-strong-random-string>
```

**Application Variables**:
```
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

**Optional Monitoring** (if configured):
```
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
NEXT_PUBLIC_LOGROCKET_APP_ID=xxxxx/xxxxx
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Important**: 
- Select "Production" environment for all variables
- Optionally add to "Preview" for staging deployments
- Never add production secrets to "Development"

#### 3.4 Deploy

1. Click "Deploy"
2. Wait for build to complete (2-5 minutes)
3. Verify deployment at the provided URL

### 4. Custom Domain Setup

#### 4.1 Add Domain to Vercel

1. Go to Project Settings → Domains
2. Add your custom domain
3. Vercel will provide DNS records

#### 4.2 Configure DNS

Add these records to your domain provider:

**For apex domain (fantooo.com)**:
```
Type: A
Name: @
Value: 76.76.21.21
```

**For www subdomain**:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

#### 4.3 Update Environment Variables

Update `NEXT_PUBLIC_APP_URL` to your custom domain:
```
NEXT_PUBLIC_APP_URL=https://fantooo.com
```

#### 4.4 Update Supabase Redirect URLs

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Update Site URL to `https://fantooo.com`
3. Update Redirect URLs to include your domain

### 5. Cron Job Configuration

Vercel automatically configures cron jobs from `vercel.json`.

#### 5.1 Verify Cron Setup

1. Go to Project Settings → Cron Jobs
2. Verify "Idle Detection" job is listed
3. Schedule: Every minute (`* * * * *`)
4. Path: `/api/cron/idle-detection`

#### 5.2 Test Cron Job

```bash
# Test the endpoint manually
curl -X GET https://your-domain.com/api/cron/idle-detection \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response: `{"success": true}`

### 6. Post-Deployment Verification

#### 6.1 Create Admin Account

Run this SQL in Supabase SQL Editor:

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

#### 6.2 Create Test Operator

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

#### 6.3 Test Core Functionality

- [ ] Admin login at `/admin-login`
- [ ] Operator login at `/op-login`
- [ ] Real user registration at `/get-started`
- [ ] Create fictional profiles (admin)
- [ ] Browse profiles (real user)
- [ ] Start a chat (real user)
- [ ] Operator assignment works
- [ ] Real-time messaging works
- [ ] Credit purchase with Paystack
- [ ] Idle detection triggers after 5 minutes
- [ ] Cron job runs every minute

#### 6.4 Monitor Logs

1. Go to Vercel Dashboard → Deployments → [Latest] → Logs
2. Monitor for errors during first few hours
3. Check Supabase Dashboard → Logs for database errors

### 7. Performance Optimization

#### 7.1 Enable Caching

Vercel automatically caches static assets. Verify:
- Images are optimized via Next.js Image component
- API routes have appropriate cache headers
- Static pages are pre-rendered

#### 7.2 Monitor Performance

1. Use Vercel Analytics (enable in project settings)
2. Monitor Core Web Vitals
3. Check Supabase Dashboard → Reports for slow queries

#### 7.3 Database Optimization

```sql
-- Run ANALYZE to update statistics
ANALYZE;

-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY abs(correlation) DESC;
```

### 8. Security Hardening

#### 8.1 Enable Rate Limiting

Rate limiting is built into the application. Verify it's working:

```bash
# Test rate limit on auth endpoint
for i in {1..10}; do
  curl -X POST https://your-domain.com/api/auth/login
done
```

Should return 429 after 5 attempts.

#### 8.2 Review RLS Policies

```sql
-- Verify all tables have RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;
```

Should return no rows.

#### 8.3 Rotate Secrets

Schedule regular rotation of:
- `CRON_SECRET` (every 90 days)
- `PAYSTACK_SECRET_KEY` (as needed)
- `SUPABASE_SERVICE_ROLE_KEY` (only if compromised)

### 9. Monitoring & Alerts

#### 9.1 Set Up Error Monitoring (Optional)

**Sentry**:
1. Create Sentry project
2. Add `NEXT_PUBLIC_SENTRY_DSN` to environment variables
3. Install Sentry SDK: `npm install @sentry/nextjs`
4. Run: `npx @sentry/wizard@latest -i nextjs`

**LogRocket**:
1. Create LogRocket project
2. Add `NEXT_PUBLIC_LOGROCKET_APP_ID` to environment variables
3. Install LogRocket: `npm install logrocket`

#### 9.2 Set Up Uptime Monitoring

Use services like:
- [UptimeRobot](https://uptimerobot.com)
- [Pingdom](https://www.pingdom.com)
- [Better Uptime](https://betteruptime.com)

Monitor these endpoints:
- `https://your-domain.com` (main site)
- `https://your-domain.com/api/health` (if implemented)

#### 9.3 Database Monitoring

1. Enable Supabase email alerts
2. Monitor connection pool usage
3. Set up alerts for slow queries (>1s)

### 10. Backup & Recovery

#### 10.1 Database Backups

Supabase automatically backs up your database daily. To create manual backup:

```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Or use pg_dump directly
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > backup.sql
```

#### 10.2 Disaster Recovery Plan

1. Keep database backups in separate location
2. Document recovery procedures
3. Test recovery process quarterly
4. Maintain list of all environment variables

### 11. Scaling Considerations

#### 11.1 Database Scaling

When you reach these limits, consider upgrading:
- 500+ concurrent users
- 10,000+ messages per day
- 100+ operators

Upgrade options:
- Increase Supabase plan for more connections
- Enable read replicas for analytics queries
- Implement Redis caching for hot data

#### 11.2 Application Scaling

Vercel automatically scales your application. Monitor:
- Function execution time (should be <10s)
- Cold start times
- Memory usage

### 12. Maintenance

#### 12.1 Regular Tasks

**Weekly**:
- Review error logs
- Check Paystack transaction reconciliation
- Monitor operator performance metrics

**Monthly**:
- Review and optimize slow queries
- Update dependencies: `npm update`
- Review security advisories: `npm audit`

**Quarterly**:
- Rotate `CRON_SECRET`
- Review and update RLS policies
- Performance audit
- Test disaster recovery

#### 12.2 Updating the Application

```bash
# 1. Test changes locally
npm run build
npm start

# 2. Push to Git
git add .
git commit -m "Update: description"
git push origin main

# 3. Vercel auto-deploys from main branch
# 4. Monitor deployment in Vercel dashboard
# 5. Verify changes in production
```

## Troubleshooting

### Build Failures

**Error**: `Module not found`
- Solution: Run `npm install` and commit `package-lock.json`

**Error**: `Type errors`
- Solution: Run `npm run build` locally to catch TypeScript errors

### Database Connection Issues

**Error**: `Connection timeout`
- Solution: Check if connection pooling URL is correct
- Verify Supabase project is not paused

**Error**: `Too many connections`
- Solution: Enable connection pooling with `SUPABASE_POOLING_URL`

### Cron Job Not Running

**Error**: Cron job not executing
- Solution: Verify `CRON_SECRET` matches in both Vercel and code
- Check Vercel Cron Jobs settings
- Ensure endpoint returns 200 status

### Payment Issues

**Error**: Paystack webhook not receiving events
- Solution: Verify webhook URL in Paystack dashboard
- Check webhook signature verification
- Ensure HTTPS is enabled

## Support

For issues:
1. Check Vercel deployment logs
2. Check Supabase logs
3. Review this deployment guide
4. Contact support if needed

## Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Paystack Documentation](https://paystack.com/docs)
