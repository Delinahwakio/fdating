# Fantooo Database Migrations

This directory contains SQL migrations for the Fantooo platform database schema.

## Migration Files

### 001_initial_schema.sql
Creates all database tables with proper constraints:
- **real_users**: Authenticated users who chat with fictional profiles
- **fictional_users**: Fictional profiles managed by operators
- **operators**: Staff members who handle conversations
- **admins**: Platform administrators
- **chats**: Active conversations between real users and fictional profiles
- **messages**: Individual messages within chats
- **favorites**: Real users' favorite fictional profiles
- **transactions**: Credit purchase transactions via Paystack
- **operator_stats**: Daily performance statistics for operators
- **operator_activity**: Activity tracking for idle detection
- **chat_assignments**: Historical record of chat assignments

**Constraints Applied:**
- CHECK constraints for age (18-100), gender (male/female), credits (>= 0), message length (1-5000)
- UNIQUE constraints for email, name, and chat combinations
- Foreign key relationships with appropriate CASCADE/SET NULL behaviors
- Automatic timestamp triggers for updated_at fields

### 002_indexes.sql
Creates performance indexes for frequently queried fields:
- Single-column indexes on foreign keys and lookup fields
- Composite indexes for complex queries (assignment queue, chat history)
- Partial indexes for filtered queries (active chats, available operators)
- Optimized indexes for real-time features (idle detection, message retrieval)

**Key Optimizations:**
- `idx_chats_assignment_queue`: Optimizes operator assignment queue retrieval
- `idx_chats_idle_detection`: Speeds up idle chat detection for reassignment
- `idx_messages_chat_created`: Optimizes message loading in chat interfaces
- `idx_fictional_active_gender`: Speeds up profile discovery by gender preference

### 003_rls_policies.sql
Implements Row Level Security (RLS) policies for data access control:
- **Real Users**: Can only view/update own profile; operators see assigned chat users
- **Fictional Users**: Real users see active profiles; operators see all; admins manage all
- **Chats**: Users see own chats; operators see assigned; admins see all
- **Messages**: Users/operators see messages in their chats; operators send as fictional
- **Transactions**: Users see own; system creates via webhooks; admins see all
- **Operators**: Can view/update own profile; admins manage all
- **Stats & Activity**: Operators see own; system manages; admins see all

**Helper Functions:**
- `is_admin()`: Checks if current user is an admin
- `is_operator()`: Checks if current user is an operator
- `is_real_user()`: Checks if current user is a real user

### 004_functions.sql
Creates database functions for business logic:

**assign_chat_to_operator(p_operator_id UUID)**
- Assigns oldest waiting chat to available operator
- Uses row-level locking (FOR UPDATE SKIP LOCKED) to prevent race conditions
- Validates operator status and prevents multiple assignments
- Records assignment in history and initializes activity tracking
- Returns chat_id or NULL if no chats waiting

**release_and_reassign_chat(p_chat_id UUID, p_reason TEXT)**
- Releases chat from current operator and returns to queue
- Tracks reassignment count and flags for admin review after 3 attempts
- Updates assignment history with release reason
- Cleans up operator activity records
- Returns boolean indicating success

**get_available_fictional_profiles(p_user_id UUID, p_limit INT, p_offset INT)**
- Returns fictional profiles matching user's gender preference
- Includes favorite status for each profile
- Supports pagination for infinite scroll
- Only returns active profiles

**update_operator_stats(p_operator_id UUID, p_date DATE)**
- Updates daily statistics for operator performance
- Counts messages sent and unique chats handled
- Upserts into operator_stats table

**get_operator_performance_stats(p_operator_id UUID, p_days INT)**
- Returns comprehensive performance metrics
- Calculates average response time
- Counts idle incidents
- Aggregates daily stats as JSONB

**get_chat_with_details(p_chat_id UUID)**
- Returns complete chat information with user and profile details
- Joins real_users and fictional_users tables
- Used for operator three-panel interface

**Automatic Triggers:**
- `trigger_increment_operator_messages`: Auto-increments operator message count
- `trigger_update_chat_message_count`: Updates chat message count and last_message_at

## Running Migrations

### Local Development with Supabase CLI

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db reset

# Or apply specific migration
supabase migration up
```

### Production Deployment

```bash
# Link to production project
supabase link --project-ref your-project-ref

# Push migrations to production
supabase db push

# Or use Supabase Dashboard to run migrations manually
```

## Migration Order

Migrations must be applied in numerical order:
1. 001_initial_schema.sql - Creates tables and constraints
2. 002_indexes.sql - Adds performance indexes
3. 003_rls_policies.sql - Enables RLS and creates policies
4. 004_functions.sql - Creates business logic functions

## Testing Migrations

After applying migrations, verify:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';
```

## Security Notes

- All tables have RLS enabled by default
- Service role key bypasses RLS for system operations (webhooks, cron jobs)
- Anon key respects RLS policies for client-side operations
- Helper functions use SECURITY DEFINER for role checking
- Input validation should still be performed at application level

## Performance Considerations

- Indexes are optimized for read-heavy workloads
- Partial indexes reduce index size for filtered queries
- Composite indexes support common query patterns
- Connection pooling should be configured in application layer
- Consider query result caching for frequently accessed data

## Rollback Strategy

To rollback migrations:

```bash
# Rollback last migration
supabase migration down

# Or manually drop objects in reverse order:
# 1. Drop functions
# 2. Drop RLS policies
# 3. Drop indexes
# 4. Drop tables
```

## Future Migrations

When creating new migrations:
1. Use sequential numbering (005_, 006_, etc.)
2. Include descriptive names
3. Add comments for complex logic
4. Test locally before production deployment
5. Consider backward compatibility
6. Document breaking changes
