-- Fantooo Platform Database Schema
-- Migration 015: Fix Chat Assignment Function
-- Purpose: Update assignment logic to use chat_state and prevent same-operator reassignment

-- ============================================================================
-- FUNCTION: assign_chat_to_operator (UPDATED)
-- Purpose: Assigns the oldest waiting chat to an available operator
-- Changes: 
--   - Uses chat_state instead of assigned_operator_id check
--   - Prevents reassignment to same operator
--   - Updates chat_state properly
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_chat_to_operator(p_operator_id UUID)
RETURNS UUID 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat_id UUID;
  v_operator_active BOOLEAN;
  v_operator_available BOOLEAN;
BEGIN
  -- Check if operator exists and is active/available
  SELECT is_active, is_available INTO v_operator_active, v_operator_available
  FROM operators
  WHERE id = p_operator_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Operator not found';
  END IF;

  IF NOT v_operator_active THEN
    RAISE EXCEPTION 'Operator is not active';
  END IF;

  IF NOT v_operator_available THEN
    RAISE EXCEPTION 'Operator is not available';
  END IF;

  -- Check if operator already has an active assignment
  IF EXISTS (
    SELECT 1 FROM chats 
    WHERE assigned_operator_id = p_operator_id 
    AND is_active = true
    AND chat_state = 'assigned'
  ) THEN
    RAISE EXCEPTION 'Operator already has an active assignment';
  END IF;

  -- Get oldest chat waiting for assignment
  -- Exclude chats where this operator was the last one to handle it
  -- This prevents the same operator from getting the same chat repeatedly
  SELECT id INTO v_chat_id
  FROM chats
  WHERE chat_state = 'waiting_assignment'
  AND is_active = true
  AND (last_operator_id IS NULL OR last_operator_id != p_operator_id)
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- If no chats available for this operator, try to get any waiting chat
  -- (This handles the case where all waiting chats were handled by this operator)
  IF v_chat_id IS NULL THEN
    SELECT id INTO v_chat_id
    FROM chats
    WHERE chat_state = 'waiting_assignment'
    AND is_active = true
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  END IF;

  -- Return NULL if no chats are waiting
  IF v_chat_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Assign chat to operator
  UPDATE chats
  SET 
    assigned_operator_id = p_operator_id,
    assignment_time = NOW(),
    chat_state = 'assigned',
    last_operator_id = p_operator_id,
    updated_at = NOW()
  WHERE id = v_chat_id;

  -- Record assignment in history
  INSERT INTO chat_assignments (chat_id, operator_id, assigned_at)
  VALUES (v_chat_id, p_operator_id, NOW());

  -- Initialize operator activity tracking
  INSERT INTO operator_activity (chat_id, operator_id, last_activity)
  VALUES (v_chat_id, p_operator_id, NOW())
  ON CONFLICT (chat_id, operator_id) 
  DO UPDATE SET last_activity = NOW(), updated_at = NOW();

  RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: release_and_reassign_chat (UPDATED)
-- Purpose: Releases a chat from an operator and returns to queue
-- Changes: Updates chat_state to 'waiting_assignment'
-- ============================================================================

CREATE OR REPLACE FUNCTION release_and_reassign_chat(
  p_chat_id UUID,
  p_reason TEXT DEFAULT 'manual_release'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_previous_operator_id UUID;
  v_reassignment_count INTEGER;
  v_max_reassignments INTEGER;
BEGIN
  -- Get max reassignments from configuration
  SELECT (value)::INTEGER INTO v_max_reassignments
  FROM platform_config
  WHERE key = 'max_reassignments';
  
  -- Default to 3 if not found
  IF v_max_reassignments IS NULL THEN
    v_max_reassignments := 3;
  END IF;

  -- Get current operator assignment
  SELECT assigned_operator_id INTO v_previous_operator_id
  FROM chats
  WHERE id = p_chat_id
  AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chat not found or not active';
  END IF;

  IF v_previous_operator_id IS NULL THEN
    RAISE EXCEPTION 'Chat is not currently assigned';
  END IF;

  -- Count previous reassignments
  SELECT COUNT(*) INTO v_reassignment_count
  FROM chat_assignments
  WHERE chat_id = p_chat_id
  AND released_at IS NOT NULL;

  -- Check if max reassignments reached
  IF v_reassignment_count >= v_max_reassignments THEN
    -- Flag chat for admin review instead of reassigning
    UPDATE chats
    SET 
      assigned_operator_id = NULL,
      assignment_time = NULL,
      chat_state = 'completed',
      is_active = false,
      updated_at = NOW()
    WHERE id = p_chat_id;

    -- Update assignment history
    UPDATE chat_assignments
    SET 
      released_at = NOW(),
      release_reason = p_reason || ' - max reassignments reached'
    WHERE chat_id = p_chat_id
    AND operator_id = v_previous_operator_id
    AND released_at IS NULL;

    RETURN false;
  END IF;

  -- Release chat from current operator and return to queue
  UPDATE chats
  SET 
    assigned_operator_id = NULL,
    assignment_time = NULL,
    chat_state = 'waiting_assignment',
    updated_at = NOW()
  WHERE id = p_chat_id;

  -- Update assignment history
  UPDATE chat_assignments
  SET 
    released_at = NOW(),
    release_reason = p_reason
  WHERE chat_id = p_chat_id
  AND operator_id = v_previous_operator_id
  AND released_at IS NULL;

  -- Remove operator activity record
  DELETE FROM operator_activity
  WHERE chat_id = p_chat_id
  AND operator_id = v_previous_operator_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION assign_chat_to_operator IS 'Assigns oldest waiting chat to available operator, prevents same-operator reassignment, uses chat_state for proper tracking';
COMMENT ON FUNCTION release_and_reassign_chat IS 'Releases chat from operator and returns to queue with proper state management';

