-- Fantooo Platform Database Schema
-- Migration 016: Chat State Verification and Constraints
-- Purpose: Add additional safeguards and verification for chat state management

-- ============================================================================
-- STEP 1: Add constraint to ensure chat_state consistency
-- ============================================================================

-- Ensure that if chat is in 'assigned' state, it must have an assigned_operator_id
ALTER TABLE chats ADD CONSTRAINT chk_assigned_state_has_operator
CHECK (
  (chat_state = 'assigned' AND assigned_operator_id IS NOT NULL) OR
  (chat_state != 'assigned')
);

-- Ensure that if chat is in 'waiting_real_user_reply', it must have operator_replied_at
ALTER TABLE chats ADD CONSTRAINT chk_waiting_reply_has_timestamp
CHECK (
  (chat_state = 'waiting_real_user_reply' AND operator_replied_at IS NOT NULL) OR
  (chat_state != 'waiting_real_user_reply')
);

-- ============================================================================
-- STEP 2: Create function to validate chat state transitions
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_chat_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Log state transitions for debugging
  IF OLD.chat_state IS DISTINCT FROM NEW.chat_state THEN
    RAISE NOTICE 'Chat % state transition: % -> %', NEW.id, OLD.chat_state, NEW.chat_state;
  END IF;

  -- Validate state transitions
  -- waiting_assignment -> assigned (operator gets chat)
  IF OLD.chat_state = 'waiting_assignment' AND NEW.chat_state = 'assigned' THEN
    IF NEW.assigned_operator_id IS NULL THEN
      RAISE EXCEPTION 'Cannot transition to assigned state without operator';
    END IF;
  END IF;

  -- assigned -> waiting_real_user_reply (operator sends message)
  IF OLD.chat_state = 'assigned' AND NEW.chat_state = 'waiting_real_user_reply' THEN
    IF NEW.operator_replied_at IS NULL THEN
      RAISE EXCEPTION 'Cannot transition to waiting_real_user_reply without operator_replied_at';
    END IF;
  END IF;

  -- waiting_real_user_reply -> waiting_assignment (real user sends message)
  IF OLD.chat_state = 'waiting_real_user_reply' AND NEW.chat_state = 'waiting_assignment' THEN
    -- This is valid, no additional checks needed
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for state validation (disabled by default, enable for debugging)
-- CREATE TRIGGER trigger_validate_chat_state
--   BEFORE UPDATE ON chats
--   FOR EACH ROW
--   WHEN (OLD.chat_state IS DISTINCT FROM NEW.chat_state)
--   EXECUTE FUNCTION validate_chat_state_transition();

-- ============================================================================
-- STEP 3: Create view for monitoring chat states
-- ============================================================================

CREATE OR REPLACE VIEW chat_state_summary AS
SELECT 
  chat_state,
  COUNT(*) as count,
  COUNT(CASE WHEN assigned_operator_id IS NOT NULL THEN 1 END) as with_operator,
  COUNT(CASE WHEN last_operator_id IS NOT NULL THEN 1 END) as has_last_operator,
  MIN(created_at) as oldest_chat,
  MAX(created_at) as newest_chat
FROM chats
WHERE is_active = true
GROUP BY chat_state;

-- ============================================================================
-- STEP 4: Create function to get chat assignment queue status
-- ============================================================================

CREATE OR REPLACE FUNCTION get_assignment_queue_status()
RETURNS TABLE (
  total_waiting INTEGER,
  total_assigned INTEGER,
  total_waiting_reply INTEGER,
  oldest_waiting_chat TIMESTAMPTZ,
  average_wait_time_minutes NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE chat_state = 'waiting_assignment')::INTEGER as total_waiting,
    COUNT(*) FILTER (WHERE chat_state = 'assigned')::INTEGER as total_assigned,
    COUNT(*) FILTER (WHERE chat_state = 'waiting_real_user_reply')::INTEGER as total_waiting_reply,
    MIN(created_at) FILTER (WHERE chat_state = 'waiting_assignment') as oldest_waiting_chat,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 60) FILTER (WHERE chat_state = 'waiting_assignment')::NUMERIC as average_wait_time_minutes
  FROM chats
  WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: Create function to detect stuck chats
-- ============================================================================

CREATE OR REPLACE FUNCTION detect_stuck_chats(p_hours INTEGER DEFAULT 24)
RETURNS TABLE (
  chat_id UUID,
  chat_state TEXT,
  assigned_operator_id UUID,
  last_operator_id UUID,
  hours_in_state NUMERIC,
  last_message_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as chat_id,
    c.chat_state,
    c.assigned_operator_id,
    c.last_operator_id,
    EXTRACT(EPOCH FROM (NOW() - c.updated_at)) / 3600 as hours_in_state,
    c.last_message_at
  FROM chats c
  WHERE c.is_active = true
  AND c.updated_at < NOW() - (p_hours || ' hours')::INTERVAL
  ORDER BY c.updated_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: Add comments for documentation
-- ============================================================================

COMMENT ON VIEW chat_state_summary IS 'Summary of chat states for monitoring and debugging';
COMMENT ON FUNCTION get_assignment_queue_status IS 'Returns current status of chat assignment queue';
COMMENT ON FUNCTION detect_stuck_chats IS 'Detects chats that have been in the same state for too long';
COMMENT ON FUNCTION validate_chat_state_transition IS 'Validates chat state transitions (trigger function)';

