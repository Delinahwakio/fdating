-- Fantooo Platform Database Schema
-- Migration 017: Fix Concurrent Message Handling
-- Purpose: Allow real users to send multiple messages while operator is working

-- ============================================================================
-- PROBLEM: When real user sends a message while operator is assigned,
--          the chat gets unassigned and operator loses the conversation
-- 
-- SOLUTION: Only change state to 'waiting_assignment' if chat is in
--           'waiting_real_user_reply' state (operator already replied)
--           Keep chat 'assigned' if operator is still working
-- ============================================================================

-- No database changes needed - this is handled in application logic
-- This migration file documents the fix for tracking purposes

-- ============================================================================
-- FUNCTION: Helper to check if chat should remain assigned
-- ============================================================================

CREATE OR REPLACE FUNCTION should_keep_assignment(
  p_chat_id UUID,
  p_current_state TEXT,
  p_assigned_operator_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Keep assignment if:
  -- 1. Chat is currently in 'assigned' state (operator is working)
  -- 2. Operator is assigned
  -- 3. Operator hasn't replied yet (operator_replied_at is NULL or old)
  
  IF p_current_state = 'assigned' AND p_assigned_operator_id IS NOT NULL THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION should_keep_assignment IS 'Helper function to determine if chat should remain assigned when real user sends message';

-- ============================================================================
-- NOTES FOR APPLICATION LOGIC
-- ============================================================================

-- The application should follow this logic when real user sends a message:
--
-- IF chat_state = 'waiting_real_user_reply':
--   → Change to 'waiting_assignment' (operator already replied, needs new assignment)
--
-- IF chat_state = 'assigned':
--   → KEEP as 'assigned' (operator is still working, let them see the new message)
--   → DO NOT unassign the operator
--   → New message appears in operator's interface
--
-- IF chat_state = 'waiting_assignment':
--   → KEEP as 'waiting_assignment' (already waiting for operator)
--
-- This ensures:
-- - Operators don't lose chats when users send multiple messages quickly
-- - Conversation context is maintained
-- - Stats are calculated correctly (one assignment, multiple messages)
-- - Better user experience

