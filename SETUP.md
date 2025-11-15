# Fantooo Platform Setup Guide

This guide will help you set up the Fantooo platform from scratch.

## Prerequisites

Before you begin, ensure you have:

- Node.js 18 or higher installed
- npm or yarn package manager
- A Supabase account (free tier is fine for development)
- A Paystack account (for payment integration)
- Git installed

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned (this takes a few minutes)
3. Once ready, go to Project Settings > API
4. Copy the following values:
   - Project URL
   - anon/public key
   - service_role key (keep this secret!)

## Step 3: Configure Environment Variables

1. Copy the example environment file:

```bash
cp .env.local.example .env.local
```

2. Open `.env.local` and fill in your credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Paystack Configuration
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_key_here
PAYSTACK_SECRET_KEY=sk_test_your_key_here

# Cron Job Secret (generate a random string)
CRON_SECRET=your_random_secret_string_here

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 4: Set Up Database Schema

The database migrations are located in the `supabase/migrations/` directory. You'll need to run these migrations in your Supabase project:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run each migration file in order:
   - `001_initial_schema.sql` - Creates all tables
   - `002_rls_policies.sql` - Sets up Row Level Security
   - `003_functions.sql` - Creates database functions
   - `004_indexes.sql` - Adds performance indexes

Alternatively, if you have the Supabase CLI installed:

```bash
supabase db push
```

## Step 5: Configure Paystack

1. Go to [paystack.com](https://paystack.com) and create an account
2. Navigate to Settings > API Keys & Webhooks
3. Copy your test keys (use live keys for production)
4. Set up a webhook endpoint:
   - URL: `https://your-domain.com/api/webhooks/paystack`
   - Events: Select `charge.success`

## Step 6: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Step 7: Verify Setup

1. Check that the homepage loads with the glassmorphism design
2. Verify that environment variables are loaded (check browser console for any errors)
3. Test the Supabase connection (you'll do this when implementing authentication)

## Project Structure Overview

```
fantooo/
├── app/                    # Next.js 14 App Router
│   ├── globals.css        # Global styles with Tailwind
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── lib/
│   ├── supabase/          # Supabase client configurations
│   │   ├── client.ts      # Browser client
│   │   ├── server.ts      # Server client
│   │   └── middleware.ts  # Auth middleware
│   └── utils/             # Utility functions
│       ├── constants.ts   # App constants
│       ├── validation.ts  # Input validation
│       └── formatting.ts  # Data formatting
├── types/
│   └── database.ts        # TypeScript types for database
├── middleware.ts          # Next.js middleware for auth
└── tailwind.config.ts     # Tailwind configuration
```

## Next Steps

After completing the setup:

1. Implement the database schema (Task 2)
2. Build shared UI components (Task 3)
3. Implement authentication (Task 4)
4. Continue with the remaining tasks in the implementation plan

## Troubleshooting

### Build Errors

If you encounter build errors:

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Supabase Connection Issues

- Verify your environment variables are correct
- Check that your Supabase project is active
- Ensure you're using the correct API keys (anon key for client, service role for server)

### Tailwind Not Working

- Ensure `globals.css` is imported in `app/layout.tsx`
- Check that Tailwind directives are at the top of `globals.css`
- Restart the dev server after making Tailwind config changes

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Paystack Documentation](https://paystack.com/docs)

## Support

For issues or questions, refer to the project documentation or contact the development team.
