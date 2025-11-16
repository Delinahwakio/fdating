# Chat Assignment System Fix - Implementation Guide

## Overview
This document describes the fixes implemented to resolve the chat assignment logic issues where operators could repeatedly get the same chat.

## Problem Summary
**Original Issue:** Operators could get assigned to the same chat multiple times because:
1. Chats were unassigned immediately when operator sent a message
2. No state tracking to distinguish "waiting for operator" vs "waiting for real user reply"
3. No prevention of same-operator reassignment
4. Idle detection could interfere with legitimate waiting states

## Solution Implemented

### 1. Database Changes (Migrations 014-016)

#### Migration 014: Chat State Management
**File:** `supabase/migrations/014_chat_state_management.sql`

**New Columns Added:**
- `chat_state` - Tracks current state of the chat
  - `waiting_assignment` - Real user sent message, needs operator
  - `assigned` - Operator is actively working on the chat
  - `waiting_real_user_reply` - Operator replied, waiting for real user
  - `completed` - Chat ended (for future use)
  
- `last_operator_id` - Tracks who last handled the chat (prevents immediate reassignment)
- `operator_replied_at` - Timestamp when operator last replied

**Indexes Created:**
- `idx_chats_waiting_assignment` - Fast lookup of assignable chats
- `idx_chats_last_operator` - Efficient operator filtering
- `idx_chats_operator_replied` - Track operator response times

#### Migration 015: Fix Assignment Function
**File:** `supabase/migrations/015_fix_assignment_function.sql`

**Updated Functions:**
1. `assign_chat_to_operator(p_operator_id UUID)`
   - Now checks `chat_state = 'waiting_assignment'` instead of just `assigned_operator_id IS NULL`
   - Prevents same operator from getting the same chat repeatedly
   - Updates `chat_state` to `'assigned'` when assigning
   - Sets `last_operator_id` for tracking

2. `release_and_reassign_chat(p_chat_id UUID, p_reason TEXT)`
   - Updates `chat_state` to `'waiting_assignment'` when releasing
   - Properly handles state transitions

#### Migration 016: Verification and Monitoring
**File:** `supabase/migrations/016_chat_state_verification.sql`

**Constraints Added:**
- Ensures `assigned` state always has an operator
- Ensures `waiting_real_user_reply` state has `operator_replied_at` timestamp

**Monitoring Tools:**
- `chat_state_summary` view - Overview of all chat states
- `get_assignment_queue_status()` - Queue metrics
- `detect_stuck_chats(hours)` - Find problematic chats

### 2. API Endpoint Changes

#### Operator Messages Endpoint
**File:** `app/api/operator/messages/route.ts`

**Changes:**
- When operator sends message, chat state changes to `'waiting_real_user_reply'`
- Sets `operator_replied_at` timestamp
- Unassigns operator so they can get new chats
- Removes operator activity record
- Chat is NOT assignable until real user responds

#### Real User Messages Endpoint
**File:** `app/api/messages/route.ts`

**Changes:**
- When real user sends message, chat state changes to `'waiting_assignment'`
- Makes chat assignable for operators
- Clears any existing assignment if present
- Removes operator activity records

#### Unassign Endpoint
**File:** `app/api/operator/unassign/route.ts`

**Changes:**
- Sets `chat_state` to `'waiting_assignment'` when manually unassigning
- Returns chat to the queue properly

#### Idle Detection Cron
**File:** `app/api/cron/idle-detection/route.ts`

**Changes:**
- Only checks chats in `'assigned'` state (operator actively working)
- Ignores chats in `'waiting_real_user_reply'` state (operator already replied)
- Prevents false positives for idle detection

### 3. Type Updates
**File:** `types/database.ts`

**Changes:**
- Added `chat_state`, `last_operator_id`, and `operator_replied_at` to chat types

## State Flow Diagram

```
┌─────────────────────┐
│  Real User Creates  │
│  Chat with Message  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ waiting_assignment  │ ◄──────────────┐
│  (Needs Operator)   │                │
└──────────┬──────────┘                │
           │                           │
           │ Operator requests         │
           │ assignment                │
           ▼                           │
┌─────────────────────┐                │
│      assigned       │                │
│ (Operator Working)  │                │
└──────────┬──────────┘                │
           │                           │
           │ Operator sends            │
           │ message                   │
           ▼                           │
┌─────────────────────┐                │
│waiting_real_user_   │                │
│      reply          │                │
│ (Operator Replied)  │                │
└──────────┬──────────┘                │
           │                           │
           │ Real user sends           │
           │ message                   │
           └───────────────────────────┘
```

## Deployment Steps

### Step 1: Backup Database
```bash
# Create a backup before running migrations
pg_dump your_database > backup_before_chat_fix.sql
```

### Step 2: Run Migrations
```bash
# Run migrations in order
psql your_database < supabase/migrations/014_chat_state_management.sql
psql your_database < supabase/migrations/015_fix_assignment_function.sql
psql your_database < supabase/migrations/016_chat_state_verification.sql
```

Or using Supabase CLI:
```bash
supabase db push
```

### Step 3: Verify Migration
```sql
-- Check that new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chats' 
AND column_name IN ('chat_state', 'last_operator_id', 'operator_replied_at');

-- Check chat state distribution
SELECT * FROM chat_state_summary;

-- Check assignment queue status
SELECT * FROM get_assignment_queue_status();
```

### Step 4: Deploy Code Changes
```bash
# Deploy updated API endpoints and types
git add .
git commit -m "Fix: Chat assignment logic with proper state management"
git push origin main

# Deploy to production (adjust for your deployment method)
vercel --prod
# or
npm run deploy
```

### Step 5: Monitor After Deployment
```sql
-- Monitor chat states in real-time
SELECT * FROM chat_state_summary;

-- Check for stuck chats (chats in same state for > 1 hour)
SELECT * FROM detect_stuck_chats(1);

-- Monitor assignment queue
SELECT * FROM get_assignment_queue_status();
```

## Testing Checklist

### Test 1: Normal Flow
- [ ] Real user sends message → Chat state is `waiting_assignment`
- [ ] Operator requests assignment → Gets chat, state becomes `assigned`
- [ ] Operator sends reply → Chat state becomes `waiting_real_user_reply`
- [ ] Operator requests new assignment → Gets DIFFERENT chat (not the same one)
- [ ] Real user sends reply → Chat state becomes `waiting_assignment` again

### Test 2: Same Operator Prevention
- [ ] Operator A handles chat and replies
- [ ] Real user responds
- [ ] Operator A requests assignment → Should NOT get the same chat (if other chats available)
- [ ] Operator B requests assignment → Can get the chat

### Test 3: Idle Detection
- [ ] Operator gets assigned to chat
- [ ] Operator doesn't respond for 5+ minutes
- [ ] Idle detection runs → Chat is reassigned
- [ ] Operator sends reply → Chat state becomes `waiting_real_user_reply`
- [ ] Idle detection runs → Chat is NOT reassigned (correct behavior)

### Test 4: Manual Unassignment
- [ ] Admin unassigns chat → Chat state becomes `waiting_assignment`
- [ ] Chat can be assigned to another operator

### Test 5: Edge Cases
- [ ] Real user sends message while operator is assigned → Chat becomes `waiting_assignment`
- [ ] Multiple operators request assignment simultaneously → Only one gets the chat (row locking)
- [ ] Operator with active assignment tries to get another → Rejected with error

## Monitoring Queries

### Check Current State Distribution
```sql
SELECT * FROM chat_state_summary;
```

### Find Chats Waiting Too Long
```sql
SELECT 
  id,
  chat_state,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as wait_minutes,
  last_message_at
FROM chats
WHERE chat_state = 'waiting_assignment'
AND is_active = true
ORDER BY created_at ASC
LIMIT 10;
```

### Check Operator Assignment History
```sql
SELECT 
  o.name as operator_name,
  COUNT(*) as total_assignments,
  COUNT(CASE WHEN ca.released_at IS NOT NULL THEN 1 END) as completed,
  COUNT(CASE WHEN ca.released_at IS NULL THEN 1 END) as active
FROM chat_assignments ca
JOIN operators o ON ca.operator_id = o.id
WHERE ca.assigned_at > NOW() - INTERVAL '24 hours'
GROUP BY o.id, o.name
ORDER BY total_assignments DESC;
```

### Detect Problematic Patterns
```sql
-- Find chats that keep getting reassigned to same operator
SELECT 
  c.id,
  c.chat_state,
  c.last_operator_id,
  o.name as last_operator_name,
  COUNT(ca.id) as assignment_count
FROM chats c
LEFT JOIN operators o ON c.last_operator_id = o.id
LEFT JOIN chat_assignments ca ON c.id = ca.chat_id
WHERE c.is_active = true
GROUP BY c.id, c.chat_state, c.last_operator_id, o.name
HAVING COUNT(ca.id) > 3
ORDER BY assignment_count DESC;
```

## Rollback Plan

If issues occur, rollback with:

```sql
-- Remove new columns
ALTER TABLE chats DROP COLUMN IF EXISTS chat_state;
ALTER TABLE chats DROP COLUMN IF EXISTS last_operator_id;
ALTER TABLE chats DROP COLUMN IF EXISTS operator_replied_at;

-- Restore old function (from migration 004)
-- Copy the original function from supabase/migrations/004_functions.sql
```

Then redeploy previous code version.

## Performance Considerations

### Indexes Created
All necessary indexes are created in migration 014:
- `idx_chats_waiting_assignment` - Speeds up assignment queries
- `idx_chats_last_operator` - Efficient operator filtering
- `idx_chats_operator_replied` - Track response times

### Query Performance
The new `chat_state` column with proper indexing should improve query performance:
- Assignment queries are faster (indexed state check)
- No need for complex NULL checks
- Row-level locking prevents race conditions

## Support and Troubleshooting

### Common Issues

**Issue:** Chats stuck in `assigned` state
**Solution:** Run idle detection manually or use:
```sql
SELECT * FROM detect_stuck_chats(1);
-- Then manually release stuck chats
SELECT release_and_reassign_chat('chat-id-here', 'manual_fix');
```

**Issue:** Operator keeps getting same chat
**Solution:** Check if `last_operator_id` is being set:
```sql
SELECT id, chat_state, last_operator_id, operator_replied_at
FROM chats
WHERE id = 'problematic-chat-id';
```

**Issue:** Chat not appearing in assignment queue
**Solution:** Check chat state:
```sql
SELECT id, chat_state, assigned_operator_id, is_active
FROM chats
WHERE id = 'missing-chat-id';
-- Should be: chat_state = 'waiting_assignment', is_active = true
```

## Success Metrics

After deployment, monitor these metrics:

1. **Assignment Distribution**
   - Operators should get different chats
   - Same-operator reassignment should be rare

2. **Queue Wait Times**
   - Average wait time for assignment
   - Number of chats waiting

3. **State Transitions**
   - Proper flow through states
   - No stuck chats

4. **Operator Efficiency**
   - Messages per operator
   - Response times
   - Idle incidents

## Conclusion

This fix implements proper state management for the chat assignment system, preventing operators from repeatedly getting the same chat and ensuring a smooth flow from real user message → operator assignment → operator reply → real user reply → new assignment.

The solution is production-ready with proper constraints, indexes, monitoring tools, and comprehensive testing guidelines.

