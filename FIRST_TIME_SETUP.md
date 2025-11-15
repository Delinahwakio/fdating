# First Time Setup Guide

## Automatic Admin Setup Flow

The Fantooo platform now includes an automatic first-time setup flow that makes getting started super easy!

### How It Works

1. **Visit Admin Login** - Go to `/admin-login`
2. **Auto-Redirect** - If no admin exists, you'll be automatically redirected to `/setup`
3. **Create Admin** - Fill out the setup form with:
   - Full Name
   - Email Address
   - Password (minimum 8 characters)
   - Confirm Password
4. **Done!** - You'll be redirected back to login with your new admin account

### What Happens Behind the Scenes

- The system checks if any admin exists in the database
- If not, the setup page is shown
- A secure database function creates both the auth user and admin record
- The `system_initialized` flag is set to prevent duplicate setups
- You're redirected to login with a success message

### Database Migration

The setup flow requires migration `009_initial_setup.sql` which adds:
- `system_initialized` config flag
- `has_admin()` function to check if admin exists
- `create_initial_admin()` function to securely create the first admin

### Security Features

- Password must be at least 8 characters
- Passwords are hashed using bcrypt
- Setup can only be run once (when no admin exists)
- All validation happens server-side
- Uses Supabase RPC for secure database operations

### Manual Setup (Alternative)

If you prefer to create the admin manually via Supabase dashboard:

1. Go to Authentication > Users in Supabase
2. Create a new user
3. Copy the user ID
4. Run this SQL:
```sql
INSERT INTO admins (id, name, email, is_super_admin)
VALUES ('user-id-here', 'Admin Name', 'admin@email.com', true);
```

### Troubleshooting

**"Admin already exists" error**
- An admin has already been created
- Go directly to `/admin-login` to sign in

**Setup page not loading**
- Check that migration 009 has been run
- Verify Supabase connection in `.env.local`

**Can't create admin**
- Check browser console for errors
- Verify database functions exist: `has_admin()` and `create_initial_admin()`
- Check Supabase logs for detailed error messages

### Files Involved

- `supabase/migrations/009_initial_setup.sql` - Database functions
- `app/(public)/setup/page.tsx` - Setup UI
- `app/(public)/admin-login/page.tsx` - Login with redirect logic
- `app/api/setup/check/route.ts` - Check if setup needed
- `app/api/setup/create-admin/route.ts` - Create admin endpoint

