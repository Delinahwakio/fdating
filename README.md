# Fantooo Platform

A fantasy chat platform that connects real users with fictional profiles managed by operators. Built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## Features

- Real-time messaging with Supabase Realtime
- Credit-based monetization via Paystack
- Intelligent operator assignment with idle detection
- Glassmorphism UI design with dark theme
- Role-based access (Real Users, Operators, Admins)

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript 5
- **Styling**: Tailwind CSS 3 with custom glassmorphism utilities
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Payments**: Paystack
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Paystack account (for payments)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy the environment variables template:

```bash
cp .env.local.example .env.local
```

3. Update `.env.local` with your Supabase and Paystack credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
CRON_SECRET=your_random_secret_string
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
fantooo/
├── app/                    # Next.js app directory
│   ├── (public)/          # Public routes (landing, auth)
│   ├── (real-user)/       # Real user interface
│   ├── (operator)/        # Operator interface
│   ├── (admin)/           # Admin panel
│   └── api/               # API routes
├── components/            # React components
│   ├── shared/           # Shared UI components
│   ├── real-user/        # Real user components
│   ├── operator/         # Operator components
│   └── admin/            # Admin components
├── lib/                   # Utility functions
│   ├── supabase/         # Supabase clients
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom hooks
│   └── utils/            # Helper functions
├── types/                 # TypeScript types
└── supabase/             # Database migrations and functions
```

## Environment Variables

### Required Variables

All required environment variables are documented in `.env.local.example`. Copy this file to `.env.local` and fill in your values.

#### Supabase Configuration

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public) | Supabase Dashboard → Settings → API → Project API keys → anon/public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret) | Supabase Dashboard → Settings → API → Project API keys → service_role |
| `SUPABASE_POOLING_URL` | Connection pooling URL (optional) | Supabase Dashboard → Settings → Database → Connection Pooling |

**Security Note**: The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. Never expose it in client-side code.

#### Paystack Configuration

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key | Paystack Dashboard → Settings → API Keys & Webhooks → Public Key |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (secret) | Paystack Dashboard → Settings → API Keys & Webhooks → Secret Key |

**Important**: Use test keys (`pk_test_` and `sk_test_`) for development. Switch to live keys (`pk_live_` and `sk_live_`) for production.

#### Security Configuration

| Variable | Description | How to Generate |
|----------|-------------|-----------------|
| `CRON_SECRET` | Secret for authenticating cron jobs | Run: `openssl rand -base64 32` or use any strong random string (min 32 chars) |

#### Application Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Base URL of your application | Development: `http://localhost:3000`<br>Production: `https://fantooo.com` |

### Optional Variables

#### Monitoring & Error Tracking

| Variable | Description | Service |
|----------|-------------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for error tracking | [Sentry](https://sentry.io) |
| `NEXT_PUBLIC_LOGROCKET_APP_ID` | LogRocket App ID for session replay | [LogRocket](https://logrocket.com) |

#### Analytics

| Variable | Description | Service |
|----------|-------------|---------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics Measurement ID | [Google Analytics](https://analytics.google.com) |

#### Development Only

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Enable debug logging | `false` |
| `DISABLE_RATE_LIMIT` | Bypass rate limiting | `false` |

### Setting Up Environment Variables

#### Local Development

1. Copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your values in `.env.local`

3. Restart your development server:
   ```bash
   npm run dev
   ```

#### Production (Vercel)

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with its production value
4. Select the appropriate environments (Production, Preview, Development)
5. Redeploy your application

**Important Production Variables**:
- Use production Supabase URL and keys
- Use live Paystack keys (not test keys)
- Set `NEXT_PUBLIC_APP_URL` to your production domain
- Generate a new strong `CRON_SECRET`
- Enable connection pooling with `SUPABASE_POOLING_URL`

### Environment Variable Security Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use different keys for development and production**
3. **Rotate secrets regularly**, especially `CRON_SECRET`
4. **Limit access** to production environment variables
5. **Use Vercel's encrypted environment variables** for sensitive data
6. **Prefix public variables** with `NEXT_PUBLIC_` only if they're safe to expose

## Design System

### Colors

- **Primary Background**: `#0F0F23`
- **Secondary Background**: `#1A1A2E`
- **Primary Red**: `#DC2626`
- **Text Primary**: `#F9FAFB`

### Glassmorphism Utilities

- `.glass-effect` - Base glass effect with backdrop blur
- `.glass-card` - Glass card with rounded corners
- `.glass-button` - Glass button with hover effects
- `.glass-input` - Glass input with focus states

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests once
- `npm run test:watch` - Run tests in watch mode

## Deployment

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/fantooo-platform)

### Manual Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions including:

- Supabase database setup and migrations
- Vercel configuration and environment variables
- Custom domain setup
- Cron job configuration
- Post-deployment verification
- Monitoring and maintenance

### Deployment Checklist

Before deploying to production:

- [ ] Run all database migrations in Supabase
- [ ] Set up all environment variables in Vercel
- [ ] Configure Paystack webhook URL
- [ ] Enable Supabase Realtime for required tables
- [ ] Set up connection pooling
- [ ] Configure custom domain (optional)
- [ ] Create admin and operator accounts
- [ ] Test core functionality
- [ ] Set up monitoring and alerts

### Continuous Integration

The project includes GitHub Actions for CI/CD:

- Automated linting and type checking
- Test execution on push and pull requests
- Security audits for dependencies
- Build verification before deployment

See `.github/workflows/ci.yml` for configuration.

### Health Check

Monitor application health at:
- Development: `http://localhost:3000/api/health`
- Production: `https://your-domain.com/api/health`

Returns JSON with status, database connectivity, and response time.

### Monitoring and Logging

The platform includes comprehensive monitoring and logging:

- **Structured Logging**: Centralized logger utility with multiple severity levels
- **Performance Monitoring**: Track slow operations and API response times
- **Error Tracking**: Optional Sentry integration for error monitoring
- **Session Replay**: Optional LogRocket integration for debugging
- **Health Checks**: Automated endpoint for uptime monitoring
- **Database Monitoring**: Built-in Supabase monitoring and slow query detection

See [MONITORING.md](./MONITORING.md) for detailed setup instructions.

## License

Private - All rights reserved
