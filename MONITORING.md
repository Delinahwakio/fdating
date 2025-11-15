# Monitoring and Logging Guide

This guide covers setting up monitoring, logging, and alerting for the Fantooo platform.

## Overview

The platform includes built-in logging and supports integration with popular monitoring services:

- **Structured Logging**: Centralized logger utility (`lib/utils/logger.ts`)
- **Error Tracking**: Sentry integration (optional)
- **Session Replay**: LogRocket integration (optional)
- **Analytics**: Google Analytics integration (optional)
- **Health Checks**: `/api/health` endpoint for uptime monitoring
- **Database Monitoring**: Supabase built-in monitoring

## Built-in Logging

### Logger Utility

The platform includes a comprehensive logging utility at `lib/utils/logger.ts`.

**Usage:**

```typescript
import { logger } from '@/lib/utils/logger'

// Info logging
logger.info('User registered', { userId: user.id })

// Error logging
logger.error('Payment failed', error, { userId, amount })

// Critical errors
logger.critical('Database connection lost', error)

// Specific event logging
logger.auth('login', userId, true)
logger.payment('purchase', 100, userId, true)
logger.operator('chat_assigned', operatorId, chatId)
logger.admin('user_blocked', adminId, userId)
```


**Log Levels:**

- `debug`: Development-only detailed information
- `info`: General informational messages
- `warn`: Warning messages that don't stop execution
- `error`: Error messages that need attention
- `critical`: Critical errors requiring immediate action

### Log Storage

Critical errors are automatically sent to:
1. Console (all environments)
2. `/api/logs` endpoint (production only)
3. External monitoring services (if configured)

## Error Tracking with Sentry

### Setup

1. Create a Sentry account at [sentry.io](https://sentry.io)
2. Create a new Next.js project
3. Get your DSN from Project Settings

### Installation

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### Configuration

Add to environment variables:

```env
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

The logger utility automatically sends errors to Sentry when configured.

### Sentry Features

- **Error Tracking**: Automatic error capture
- **Performance Monitoring**: Track slow API routes
- **Release Tracking**: Associate errors with deployments
- **User Context**: Track which users experience errors
- **Breadcrumbs**: See events leading to errors

## Session Replay with LogRocket

### Setup

1. Create a LogRocket account at [logrocket.com](https://logrocket.com)
2. Create a new project
3. Get your App ID

### Installation

```bash
npm install logrocket
```

### Configuration

Add to environment variables:

```env
NEXT_PUBLIC_LOGROCKET_APP_ID=xxxxx/xxxxx
```

Create `lib/monitoring/logrocket.ts`:

```typescript
import LogRocket from 'logrocket'

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_LOGROCKET_APP_ID) {
  LogRocket.init(process.env.NEXT_PUBLIC_LOGROCKET_APP_ID)
}

export default LogRocket
```

Initialize in `app/layout.tsx`:

```typescript
import '@/lib/monitoring/logrocket'
```

### LogRocket Features

- **Session Replay**: Watch user sessions
- **Console Logs**: Capture all console output
- **Network Monitoring**: Track API calls
- **Redux/State**: Monitor state changes
- **User Identification**: Track specific users

## Google Analytics

### Setup

1. Create a Google Analytics 4 property
2. Get your Measurement ID (G-XXXXXXXXXX)

### Configuration

Add to environment variables:

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Install Google Analytics:

```bash
npm install @next/third-parties
```

Add to `app/layout.tsx`:

```typescript
import { GoogleAnalytics } from '@next/third-parties/google'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!} />
      </body>
    </html>
  )
}
```

## Uptime Monitoring

### Health Check Endpoint

The platform includes a health check at `/api/health`:

```bash
curl https://your-domain.com/api/health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "checks": {
    "database": "connected",
    "responseTime": "45ms"
  },
  "version": "abc1234",
  "environment": "production"
}
```

### Uptime Monitoring Services

**Recommended Services:**

1. **UptimeRobot** (Free tier available)
   - Monitor `/api/health` every 5 minutes
   - Email/SMS alerts on downtime
   - Status page generation

2. **Better Uptime** (Free tier available)
   - Advanced monitoring
   - Incident management
   - On-call scheduling

3. **Pingdom** (Paid)
   - Global monitoring locations
   - Real user monitoring
   - Transaction monitoring

**Setup:**

1. Create account with monitoring service
2. Add monitor for `https://your-domain.com/api/health`
3. Set check interval (5 minutes recommended)
4. Configure alert contacts
5. Set up status page (optional)

## Database Monitoring

### Supabase Built-in Monitoring

Access via Supabase Dashboard:

1. **Reports Tab**
   - Query performance
   - Slow queries (>1s)
   - Connection pool usage
   - Database size

2. **Logs Tab**
   - Database logs
   - API logs
   - Auth logs
   - Realtime logs

3. **Database Health**
   - CPU usage
   - Memory usage
   - Disk usage
   - Connection count

### Monitoring Queries

**Check slow queries:**

```sql
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 20;
```

**Check connection pool:**

```sql
SELECT 
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity;
```

**Check table sizes:**

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Vercel Monitoring

### Built-in Analytics

Enable in Vercel Dashboard → Analytics:

- **Web Vitals**: LCP, FID, CLS, TTFB
- **Real User Monitoring**: Actual user performance
- **Geographic Distribution**: Where users are located
- **Device Breakdown**: Desktop vs mobile

### Function Logs

Access via Vercel Dashboard → Deployments → [Latest] → Logs:

- Real-time function execution logs
- Error tracking
- Performance metrics
- Request/response details

### Deployment Monitoring

- Build logs and errors
- Deployment status
- Preview deployments
- Production deployments

## Alerting

### Critical Alerts

Set up alerts for:

1. **Application Down**
   - Health check fails
   - 5xx errors spike
   - Response time > 5s

2. **Database Issues**
   - Connection pool exhausted
   - Slow queries (>5s)
   - Disk space > 80%

3. **Payment Failures**
   - Paystack webhook failures
   - Credit deduction errors
   - Transaction processing errors

4. **Security Issues**
   - Rate limit exceeded
   - Authentication failures spike
   - Suspicious activity patterns

### Alert Channels

Configure multiple channels:

- **Email**: For non-urgent alerts
- **SMS**: For critical alerts
- **Slack**: For team notifications
- **PagerDuty**: For on-call rotation

## Performance Monitoring

### Key Metrics to Track

1. **Response Times**
   - API routes: < 500ms
   - Page loads: < 2s
   - Database queries: < 100ms

2. **Error Rates**
   - 4xx errors: < 1%
   - 5xx errors: < 0.1%
   - Failed payments: < 0.5%

3. **User Metrics**
   - Active users
   - Message volume
   - Credit purchases
   - Operator utilization

4. **System Metrics**
   - CPU usage: < 70%
   - Memory usage: < 80%
   - Database connections: < 80% of pool
   - Disk usage: < 80%

### Performance Optimization

Monitor and optimize:

- Slow API routes
- Large database queries
- Unoptimized images
- Bundle size
- Cache hit rates

## Log Retention

### Recommendations

- **Application Logs**: 30 days
- **Error Logs**: 90 days
- **Audit Logs**: 1 year
- **Access Logs**: 7 days

### Supabase Logs

Supabase retains logs based on plan:

- Free: 1 day
- Pro: 7 days
- Team: 28 days
- Enterprise: Custom

Export important logs for longer retention.

## Compliance and Privacy

### GDPR Considerations

- Don't log personal data unnecessarily
- Anonymize user IDs in logs
- Implement log retention policies
- Allow users to request log deletion

### Security

- Encrypt logs at rest
- Restrict log access
- Audit log access
- Sanitize sensitive data

## Monitoring Checklist

- [ ] Health check endpoint configured
- [ ] Uptime monitoring service set up
- [ ] Error tracking configured (Sentry)
- [ ] Session replay configured (LogRocket)
- [ ] Analytics configured (Google Analytics)
- [ ] Database monitoring enabled
- [ ] Slow query alerts set up
- [ ] Critical error alerts configured
- [ ] Performance metrics tracked
- [ ] Log retention policy defined
- [ ] Alert channels configured
- [ ] On-call rotation established
- [ ] Status page created
- [ ] Monitoring dashboard created

## Troubleshooting

### High Error Rate

1. Check Sentry for error patterns
2. Review recent deployments
3. Check database performance
4. Verify external service status

### Slow Performance

1. Check slow query logs
2. Review API response times
3. Check database connection pool
4. Verify CDN performance

### Database Issues

1. Check connection count
2. Review slow queries
3. Check disk space
4. Verify indexes exist

## Resources

- [Sentry Documentation](https://docs.sentry.io)
- [LogRocket Documentation](https://docs.logrocket.com)
- [Vercel Analytics](https://vercel.com/docs/analytics)
- [Supabase Monitoring](https://supabase.com/docs/guides/platform/metrics)
- [Google Analytics 4](https://support.google.com/analytics)
