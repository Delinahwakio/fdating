# Chat Assignment Fix - Deployment Checklist

## Pre-Deployment

- [ ] **Backup Database**
  ```bash
  # Using Supabase CLI
  supabase db dump -f backup_before_chat_fix.sql
  
  # Or using pg_dump
  pg_dump your_database > backup_before_chat_fix.sql
  ```

- [ ] **Review Changes**
  - [ ] Read `CHAT_ASSIGNMENT_FIX.md` for full context
  - [ ] Review migration files (014, 015, 016)
  - [ ] Review code changes in API endpoints

- [ ] **Test in Staging** (if available)
  - [ ] Run migrations in staging
  - [ ] Test assignment flow
  - [ ] Verify no errors

## Deployment Steps

### Step 1: Database Migrations (5 minutes)

- [ ] **Run Migration 014** - Add chat state columns
  ```bash
  # Using Supabase CLI
  supabase db push
  
  # Or manually
  psql your_database < supabase/migrations/014_chat_state_management.sql
  ```

- [ ] **Run Migration 015** - Update assignment functions
  ```bash
  psql your_database < supabase/migrations/015_fix_assignment_function.sql
  ```

- [ ] **Run Migration 016** - Add verification tools
  ```bash
  psql your_database < supabase/migrations/016_chat_state_verification.sql
  ```

- [ ] **Verify Migrations**
  ```bash
  psql your_database < scripts/verify-chat-fix.sql
  ```
  
  Expected output:
  - ✓ 3 new columns (chat_state, last_operator_id, operator_replied_at)
  - ✓ 3 new indexes
  - ✓ 2 new constraints
  - ✓ 5 functions
  - ✓ No invalid states

### Step 2: Deploy Code Changes (10 minutes)

- [ ] **Commit Changes**
  ```bash
  git add .
  git commit -m "Fix: Chat assignment logic with proper state management"
  git push origin main
  ```

- [ ] **Deploy to Production**
  ```bash
  # Vercel
  vercel --prod
  
  # Or your deployment method
  npm run deploy
  ```

- [ ] **Verify Deployment**
  - [ ] Check deployment logs for errors
  - [ ] Verify API endpoints are responding
  - [ ] Check that types are updated

### Step 3: Post-Deployment Verification (15 minutes)

- [ ] **Check Database State**
  ```sql
  -- Run in your database
  SELECT * FROM chat_state_summary;
  SELECT * FROM get_assignment_queue_status();
  ```

- [ ] **Monitor Logs**
  - [ ] Check application logs for errors
  - [ ] Monitor Supabase logs
  - [ ] Check for any state transition errors

- [ ] **Test Assignment Flow**
  1. [ ] Real user sends message → Chat becomes `waiting_assignment`
  2. [ ] Operator requests assignment → Gets chat, becomes `assigned`
  3. [ ] Operator sends reply → Chat becomes `waiting_real_user_reply`
  4. [ ] Operator requests new assignment → Gets DIFFERENT chat
  5. [ ] Real user replies → Chat becomes `waiting_assignment` again

- [ ] **Run Test Script**
  ```bash
  psql your_database < scripts/test-chat-assignment.sql
  ```

## Monitoring (First 24 Hours)

### Hour 1: Intensive Monitoring

- [ ] **Check every 15 minutes:**
  ```sql
  SELECT * FROM chat_state_summary;
  SELECT * FROM get_assignment_queue_status();
  SELECT * FROM detect_stuck_chats(1);
  ```

- [ ] **Monitor for:**
  - Operators getting same chat repeatedly
  - Chats stuck in any state
  - Assignment errors in logs
  - Idle detection working correctly

### Hours 2-24: Regular Monitoring

- [ ] **Check every hour:**
  - State distribution
  - Queue wait times
  - Stuck chats
  - Operator feedback

### Metrics to Track

- [ ] **Assignment Distribution**
  ```sql
  SELECT 
    o.name,
    COUNT(DISTINCT ca.chat_id) as chats_handled
  FROM chat_assignments ca
  JOIN operators o ON ca.operator_id = o.id
  WHERE ca.assigned_at > NOW() - INTERVAL '1 hour'
  GROUP BY o.name
  ORDER BY chats_handled DESC;
  ```

- [ ] **Average Wait Times**
  ```sql
  SELECT 
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 60) as avg_wait_minutes
  FROM chats
  WHERE chat_state = 'waiting_assignment'
  AND is_active = true;
  ```

- [ ] **State Transition Counts**
  ```sql
  SELECT * FROM chat_state_summary;
  ```

## Rollback Plan (If Needed)

### If Critical Issues Occur:

1. [ ] **Rollback Code**
   ```bash
   git revert HEAD
   git push origin main
   vercel --prod
   ```

2. [ ] **Rollback Database** (ONLY if absolutely necessary)
   ```sql
   -- Remove new columns
   ALTER TABLE chats DROP COLUMN IF EXISTS chat_state;
   ALTER TABLE chats DROP COLUMN IF EXISTS last_operator_id;
   ALTER TABLE chats DROP COLUMN IF EXISTS operator_replied_at;
   
   -- Restore old function from migration 004
   -- (Copy from supabase/migrations/004_functions.sql)
   ```

3. [ ] **Restore from Backup** (Last resort)
   ```bash
   psql your_database < backup_before_chat_fix.sql
   ```

## Success Criteria

After 24 hours, verify:

- [ ] **No operators reporting same-chat issues**
- [ ] **No chats stuck in invalid states**
- [ ] **Assignment queue flowing smoothly**
- [ ] **Idle detection working correctly**
- [ ] **No increase in error rates**
- [ ] **Operator satisfaction improved**

## Common Issues & Solutions

### Issue: Chats stuck in `assigned` state

**Solution:**
```sql
-- Check idle detection
SELECT * FROM detect_stuck_chats(1);

-- Manually release if needed
SELECT release_and_reassign_chat('chat-id', 'manual_fix');
```

### Issue: Operator keeps getting same chat

**Solution:**
```sql
-- Check last_operator_id
SELECT id, chat_state, last_operator_id 
FROM chats 
WHERE id = 'problematic-chat-id';

-- If last_operator_id is NULL, set it
UPDATE chats 
SET last_operator_id = (
  SELECT operator_id 
  FROM chat_assignments 
  WHERE chat_id = 'problematic-chat-id' 
  ORDER BY assigned_at DESC 
  LIMIT 1
)
WHERE id = 'problematic-chat-id';
```

### Issue: Chat not appearing in queue

**Solution:**
```sql
-- Check chat state
SELECT id, chat_state, assigned_operator_id, is_active
FROM chats
WHERE id = 'missing-chat-id';

-- Fix if needed
UPDATE chats
SET chat_state = 'waiting_assignment'
WHERE id = 'missing-chat-id'
AND is_active = true;
```

## Communication Plan

### Before Deployment
- [ ] Notify team about deployment window
- [ ] Inform operators about potential brief disruption
- [ ] Prepare support team with this checklist

### During Deployment
- [ ] Post status updates in team channel
- [ ] Keep operators informed of progress

### After Deployment
- [ ] Announce successful deployment
- [ ] Share monitoring results
- [ ] Collect operator feedback

## Support Contacts

- **Database Issues:** [Your DB Admin]
- **API Issues:** [Your Backend Team]
- **Operator Support:** [Your Support Team]
- **Emergency:** [Your On-Call Contact]

## Documentation Links

- Full Fix Documentation: `CHAT_ASSIGNMENT_FIX.md`
- State Reference: `CHAT_STATES_REFERENCE.md`
- Verification Script: `scripts/verify-chat-fix.sql`
- Test Script: `scripts/test-chat-assignment.sql`

## Sign-Off

- [ ] **Database Admin:** Migrations verified _______________
- [ ] **Backend Lead:** Code changes reviewed _______________
- [ ] **QA Lead:** Testing completed _______________
- [ ] **Product Owner:** Approved for deployment _______________

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Rollback Deadline:** _______________ (24 hours after deployment)

