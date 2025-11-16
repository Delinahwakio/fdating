-- Test Script for Chat Assignment Fix
-- This script simulates the complete flow to verify the fix works

\echo '========================================='
\echo 'Chat Assignment Fix - Integration Test'
\echo '========================================='
\echo ''

-- Setup: Create test data if needed
\echo 'Setting up test data...'

-- Create test operator if not exists
DO $$
DECLARE
  v_operator_id UUID;
  v_operator2_id UUID;
BEGIN
  -- Check if test operators exist
  SELECT id INTO v_operator_id FROM operators WHERE email = 'test.operator1@fantooo.com';
  SELECT id INTO v_operator2_id FROM operators WHERE email = 'test.operator2@fantooo.com';
  
  IF v_operator_id IS NULL THEN
    RAISE NOTICE 'Test operators not found. Please create test operators first.';
  ELSE
    RAISE NOTICE 'Test operators found: % and %', v_operator_id, v_operator2_id;
  END IF;
END $$;

\echo ''
\echo '========================================='
\echo 'TEST 1: Normal Assignment Flow'
\echo '========================================='
\echo ''

-- Find a chat in waiting_assignment state
\echo 'Finding a chat waiting for assignment...'
SELECT 
  id,
  chat_state,
  last_operator_id,
  created_at
FROM chats
WHERE chat_state = 'waiting_assignment'
AND is_active = true
ORDER BY created_at ASC
LIMIT 1;

\echo ''
\echo 'Expected: Should show a chat with chat_state = waiting_assignment'
\echo ''

-- Test assignment function
\echo 'Testing assignment function...'
\echo 'Note: Replace operator_id with actual operator ID from your database'
\echo ''
\echo 'Example command:'
\echo 'SELECT assign_chat_to_operator(''your-operator-uuid-here'');'
\echo ''

\echo '========================================='
\echo 'TEST 2: State Transitions'
\echo '========================================='
\echo ''

-- Show state transition counts
\echo 'Current state distribution:'
SELECT * FROM chat_state_summary;

\echo ''

\echo '========================================='
\echo 'TEST 3: Same Operator Prevention'
\echo '========================================='
\echo ''

-- Find chats where last_operator_id is set
\echo 'Chats with last_operator_id (should not be reassigned to same operator):'
SELECT 
  id,
  chat_state,
  last_operator_id,
  assigned_operator_id,
  operator_replied_at
FROM chats
WHERE last_operator_id IS NOT NULL
AND is_active = true
LIMIT 5;

\echo ''

\echo '========================================='
\echo 'TEST 4: Assignment Queue Status'
\echo '========================================='
\echo ''

SELECT * FROM get_assignment_queue_status();

\echo ''

\echo '========================================='
\echo 'TEST 5: Operator Activity'
\echo '========================================='
\echo ''

-- Show current operator assignments
\echo 'Currently assigned chats:'
SELECT 
  c.id as chat_id,
  c.chat_state,
  o.name as operator_name,
  c.assignment_time,
  EXTRACT(EPOCH FROM (NOW() - c.assignment_time)) / 60 as minutes_assigned
FROM chats c
JOIN operators o ON c.assigned_operator_id = o.id
WHERE c.chat_state = 'assigned'
AND c.is_active = true;

\echo ''

\echo '========================================='
\echo 'TEST 6: Waiting for Reply Chats'
\echo '========================================='
\echo ''

-- Show chats waiting for real user reply
\echo 'Chats waiting for real user reply (should NOT be assignable):'
SELECT 
  c.id as chat_id,
  c.chat_state,
  o.name as last_operator_name,
  c.operator_replied_at,
  EXTRACT(EPOCH FROM (NOW() - c.operator_replied_at)) / 60 as minutes_waiting
FROM chats c
LEFT JOIN operators o ON c.last_operator_id = o.id
WHERE c.chat_state = 'waiting_real_user_reply'
AND c.is_active = true
ORDER BY c.operator_replied_at ASC
LIMIT 5;

\echo ''

\echo '========================================='
\echo 'TEST 7: Stuck Chats Detection'
\echo '========================================='
\echo ''

-- Check for stuck chats
\echo 'Chats stuck in same state for > 1 hour:'
SELECT * FROM detect_stuck_chats(1);

\echo ''
\echo 'Expected: Ideally 0 rows'
\echo ''

\echo '========================================='
\echo 'TEST 8: Assignment History'
\echo '========================================='
\echo ''

-- Show recent assignments
\echo 'Recent chat assignments (last 10):'
SELECT 
  ca.chat_id,
  o.name as operator_name,
  ca.assigned_at,
  ca.released_at,
  ca.release_reason,
  EXTRACT(EPOCH FROM (COALESCE(ca.released_at, NOW()) - ca.assigned_at)) / 60 as duration_minutes
FROM chat_assignments ca
JOIN operators o ON ca.operator_id = o.id
ORDER BY ca.assigned_at DESC
LIMIT 10;

\echo ''

\echo '========================================='
\echo 'TEST 9: Validate State Consistency'
\echo '========================================='
\echo ''

-- Check for invalid states
\echo 'Checking for invalid states...'

\echo 'Chats in assigned state without operator:'
SELECT COUNT(*) as count
FROM chats
WHERE chat_state = 'assigned' 
AND assigned_operator_id IS NULL;

\echo ''

\echo 'Chats in waiting_real_user_reply without operator_replied_at:'
SELECT COUNT(*) as count
FROM chats
WHERE chat_state = 'waiting_real_user_reply' 
AND operator_replied_at IS NULL;

\echo ''

\echo 'Chats with assigned_operator_id but not in assigned state:'
SELECT 
  id,
  chat_state,
  assigned_operator_id
FROM chats
WHERE assigned_operator_id IS NOT NULL
AND chat_state != 'assigned'
AND is_active = true;

\echo ''
\echo 'Expected: All counts should be 0, no rows returned'
\echo ''

\echo '========================================='
\echo 'TEST 10: Manual Assignment Test'
\echo '========================================='
\echo ''

\echo 'To manually test the complete flow:'
\echo ''
\echo '1. Get an operator ID:'
\echo '   SELECT id, name FROM operators WHERE is_active = true LIMIT 1;'
\echo ''
\echo '2. Assign a chat:'
\echo '   SELECT assign_chat_to_operator(''operator-id-here'');'
\echo ''
\echo '3. Verify assignment:'
\echo '   SELECT id, chat_state, assigned_operator_id FROM chats WHERE assigned_operator_id = ''operator-id-here'';'
\echo ''
\echo '4. Try to assign another chat to same operator:'
\echo '   SELECT assign_chat_to_operator(''operator-id-here'');'
\echo '   Expected: Error "Operator already has an active assignment"'
\echo ''
\echo '5. Simulate operator sending message (manually update):'
\echo '   UPDATE chats SET'
\echo '     chat_state = ''waiting_real_user_reply'','
\echo '     operator_replied_at = NOW(),'
\echo '     assigned_operator_id = NULL'
\echo '   WHERE assigned_operator_id = ''operator-id-here'';'
\echo ''
\echo '6. Try to assign the same chat to same operator:'
\echo '   SELECT assign_chat_to_operator(''operator-id-here'');'
\echo '   Expected: Should get a DIFFERENT chat (if available)'
\echo ''
\echo '7. Simulate real user reply:'
\echo '   UPDATE chats SET chat_state = ''waiting_assignment'''
\echo '   WHERE id = ''chat-id-from-step-5'';'
\echo ''
\echo '8. Now the chat is assignable again'
\echo ''

\echo '========================================='
\echo 'Test Script Complete!'
\echo '========================================='
\echo ''
\echo 'Summary of what to verify:'
\echo '  ✓ Chats transition through states correctly'
\echo '  ✓ Operators cannot get same chat repeatedly'
\echo '  ✓ Chats in waiting_real_user_reply are not assignable'
\echo '  ✓ No invalid state combinations exist'
\echo '  ✓ Assignment queue shows correct counts'
\echo '  ✓ Idle detection only affects assigned chats'
\echo ''

