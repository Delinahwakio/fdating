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

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (server-side only) |
| `CRON_SECRET` | Secret for cron job authentication |
| `NEXT_PUBLIC_APP_URL` | Application URL (default: http://localhost:3000) |

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

## License

Private - All rights reserved
