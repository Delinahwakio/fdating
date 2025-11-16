-- Verification Script for Chat Assignment Fix
-- Run this after applying migrations 014-016

\echo '========================================='
\echo 'Chat Assignment Fix Verification'
\echo '========================================='
\echo ''

-- Check 1: Verify new columns exist
\echo 'Check 1: Verifying new columns exist...'
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'chats' 
AND column_name IN ('chat_state', 'last_operator_id', 'operator_replied_at')
ORDER BY column_name;

\echo ''
\echo 'Expected: 3 rows (chat_state, last_operator_id, operator_replied_at)'
\echo ''

-- Check 2: Verify indexes exist
\echo 'Check 2: Verifying indexes exist...'
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'chats'
AND indexname IN (
  'idx_chats_waiting_assignment',
  'idx_chats_last_operator',
  'idx_chats_operator_replied'
)
ORDER BY indexname;

\echo ''
\echo 'Expected: 3 indexes'
\echo ''

-- Check 3: Verify constraints exist
\echo 'Check 3: Verifying constraints exist...'
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'chats'::regclass
AND conname IN (
  'chk_assigned_state_has_operator',
  'chk_waiting_reply_has_timestamp'
)
ORDER BY conname;

\echo ''
\echo 'Expected: 2 constraints'
\echo ''

-- Check 4: Verify chat state distribution
\echo 'Check 4: Chat state distribution...'
SELECT * FROM chat_state_summary;

\echo ''

-- Check 5: Verify assignment queue status
\echo 'Check 5: Assignment queue status...'
SELECT * FROM get_assignment_queue_status();

\echo ''

-- Check 6: Check for any chats with invalid states
\echo 'Check 6: Checking for invalid states...'
SELECT 
  COUNT(*) as invalid_count,
  'Assigned state without operator' as issue
FROM chats
WHERE chat_state = 'assigned' AND assigned_operator_id IS NULL
UNION ALL
SELECT 
  COUNT(*) as invalid_count,
  'Waiting reply without timestamp' as issue
FROM chats
WHERE chat_state = 'waiting_real_user_reply' AND operator_replied_at IS NULL;

\echo ''
\echo 'Expected: All counts should be 0'
\echo ''

-- Check 7: Verify functions exist
\echo 'Check 7: Verifying functions exist...'
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'assign_chat_to_operator',
  'release_and_reassign_chat',
  'get_assignment_queue_status',
  'detect_stuck_chats',
  'validate_chat_state_transition'
)
ORDER BY routine_name;

\echo ''
\echo 'Expected: 5 functions'
\echo ''

-- Check 8: Sample of current chats
\echo 'Check 8: Sample of current active chats...'
SELECT 
  id,
  chat_state,
  assigned_operator_id IS NOT NULL as has_operator,
  last_operator_id IS NOT NULL as has_last_operator,
  operator_replied_at IS NOT NULL as has_reply_timestamp,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as age_minutes
FROM chats
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 10;

\echo ''

-- Check 9: Detect any stuck chats
\echo 'Check 9: Detecting stuck chats (>1 hour in same state)...'
SELECT * FROM detect_stuck_chats(1);

\echo ''
\echo 'Expected: Ideally 0 rows (no stuck chats)'
\echo ''

\echo '========================================='
\echo 'Verification Complete!'
\echo '========================================='
\echo ''
\echo 'If all checks pass:'
\echo '  - 3 new columns exist'
\echo '  - 3 new indexes exist'
\echo '  - 2 new constraints exist'
\echo '  - 5 functions exist'
\echo '  - No invalid states'
\echo '  - Chat states are properly distributed'
\echo ''
\echo 'You can now deploy the code changes!'
\echo ''

