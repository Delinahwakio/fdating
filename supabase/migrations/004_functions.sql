-- Fantooo Platform Database Schema
-- Migration 004: Database Functions for Business Logic

-- ============================================================================
-- FUNCTION: assign_chat_to_operator
-- Purpose: Assigns the oldest waiting chat to an available operator
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_chat_to_operator(p_operator_id UUID)
RETURNS UUID AS $$
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
  ) THEN
    RAISE EXCEPTION 'Operator already has an active assignment';
  END IF;

  -- Get oldest unassigned chat with row-level locking
  SELECT id INTO v_chat_id
  FROM chats
  WHERE assigned_operator_id IS NULL
  AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Return NULL if no chats are waiting
  IF v_chat_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Assign chat to operator
  UPDATE chats
  SET 
    assigned_operator_id = p_operator_id,
    assignment_time = NOW(),
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
-- FUNCTION: release_and_reassign_chat
-- Purpose: Releases a chat from an operator and reassigns to queue
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

  -- Release chat from current operator
  UPDATE chats
  SET 
    assigned_operator_id = NULL,
    assignment_time = NULL,
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
-- FUNCTION: get_available_fictional_profiles
-- Purpose: Returns fictional profiles matching user's gender preference
-- ============================================================================

CREATE OR REPLACE FUNCTION get_available_fictional_profiles(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  age INTEGER,
  gender TEXT,
  location TEXT,
  bio TEXT,
  profile_pictures TEXT[],
  is_favorited BOOLEAN
) AS $$
DECLARE
  v_looking_for TEXT;
BEGIN
  -- Get user's gender preference
  SELECT looking_for INTO v_looking_for
  FROM real_users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Return fictional profiles matching preference
  RETURN QUERY
  SELECT 
    fu.id,
    fu.name,
    fu.age,
    fu.gender,
    fu.location,
    fu.bio,
    fu.profile_pictures,
    EXISTS (
      SELECT 1 FROM favorites 
      WHERE real_user_id = p_user_id 
      AND fictional_user_id = fu.id
    ) AS is_favorited
  FROM fictional_users fu
  WHERE fu.gender = v_looking_for
  AND fu.is_active = true
  ORDER BY fu.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: update_operator_stats
-- Purpose: Updates daily statistics for an operator
-- ============================================================================

CREATE OR REPLACE FUNCTION update_operator_stats(
  p_operator_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
DECLARE
  v_messages_sent INTEGER;
  v_chats_handled INTEGER;
BEGIN
  -- Count messages sent by operator on the given date
  SELECT COUNT(*) INTO v_messages_sent
  FROM messages
  WHERE handled_by_operator_id = p_operator_id
  AND DATE(created_at) = p_date;

  -- Count unique chats handled by operator on the given date
  SELECT COUNT(DISTINCT chat_id) INTO v_chats_handled
  FROM messages
  WHERE handled_by_operator_id = p_operator_id
  AND DATE(created_at) = p_date;

  -- Insert or update operator stats
  INSERT INTO operator_stats (operator_id, date, messages_sent, chats_handled)
  VALUES (p_operator_id, p_date, v_messages_sent, v_chats_handled)
  ON CONFLICT (operator_id, date)
  DO UPDATE SET
    messages_sent = v_messages_sent,
    chats_handled = v_chats_handled;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: increment_operator_message_count
-- Purpose: Increments total message count for operator (trigger helper)
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_operator_message_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.handled_by_operator_id IS NOT NULL THEN
    UPDATE operators
    SET total_messages = total_messages + 1
    WHERE id = NEW.handled_by_operator_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-increment operator message count
CREATE TRIGGER trigger_increment_operator_messages
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.handled_by_operator_id IS NOT NULL)
  EXECUTE FUNCTION increment_operator_message_count();

-- ============================================================================
-- FUNCTION: update_chat_message_count
-- Purpose: Updates message count in chats table (trigger helper)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_chat_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats
  SET 
    message_count = message_count + 1,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update chat message count
CREATE TRIGGER trigger_update_chat_message_count
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_message_count();

-- ============================================================================
-- FUNCTION: get_operator_performance_stats
-- Purpose: Returns comprehensive performance statistics for an operator
-- ============================================================================

CREATE OR REPLACE FUNCTION get_operator_performance_stats(
  p_operator_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_messages INTEGER,
  total_chats INTEGER,
  avg_response_time_seconds NUMERIC,
  idle_incidents INTEGER,
  daily_stats JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total messages sent
    (SELECT COUNT(*)::INTEGER 
     FROM messages 
     WHERE handled_by_operator_id = p_operator_id) AS total_messages,
    
    -- Total unique chats handled
    (SELECT COUNT(DISTINCT chat_id)::INTEGER 
     FROM messages 
     WHERE handled_by_operator_id = p_operator_id) AS total_chats,
    
    -- Average response time (simplified calculation)
    (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (m2.created_at - m1.created_at))), 0)
     FROM messages m1
     JOIN messages m2 ON m1.chat_id = m2.chat_id
     WHERE m1.sender_type = 'real'
     AND m2.sender_type = 'fictional'
     AND m2.handled_by_operator_id = p_operator_id
     AND m2.created_at > m1.created_at
     AND m2.created_at <= m1.created_at + INTERVAL '1 hour'
    )::NUMERIC AS avg_response_time_seconds,
    
    -- Count of idle incidents (reassignments due to idle)
    (SELECT COUNT(*)::INTEGER
     FROM chat_assignments
     WHERE operator_id = p_operator_id
     AND release_reason LIKE '%idle%') AS idle_incidents,
    
    -- Daily stats for the past N days
    (SELECT JSONB_AGG(
       JSONB_BUILD_OBJECT(
         'date', date,
         'messages_sent', messages_sent,
         'chats_handled', chats_handled
       ) ORDER BY date DESC
     )
     FROM operator_stats
     WHERE operator_id = p_operator_id
     AND date >= CURRENT_DATE - p_days
    ) AS daily_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_chat_with_details
-- Purpose: Returns chat with full real user and fictional user details
-- ============================================================================

CREATE OR REPLACE FUNCTION get_chat_with_details(p_chat_id UUID)
RETURNS TABLE (
  chat_id UUID,
  chat_created_at TIMESTAMPTZ,
  chat_message_count INTEGER,
  chat_last_message_at TIMESTAMPTZ,
  chat_real_profile_notes TEXT,
  chat_fictional_profile_notes TEXT,
  real_user_id UUID,
  real_user_name TEXT,
  real_user_display_name TEXT,
  real_user_age INTEGER,
  real_user_gender TEXT,
  real_user_location TEXT,
  real_user_profile_picture TEXT,
  fictional_user_id UUID,
  fictional_user_name TEXT,
  fictional_user_age INTEGER,
  fictional_user_gender TEXT,
  fictional_user_location TEXT,
  fictional_user_bio TEXT,
  fictional_user_profile_pictures TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS chat_id,
    c.created_at AS chat_created_at,
    c.message_count AS chat_message_count,
    c.last_message_at AS chat_last_message_at,
    c.real_profile_notes AS chat_real_profile_notes,
    c.fictional_profile_notes AS chat_fictional_profile_notes,
    ru.id AS real_user_id,
    ru.name AS real_user_name,
    ru.display_name AS real_user_display_name,
    ru.age AS real_user_age,
    ru.gender AS real_user_gender,
    ru.location AS real_user_location,
    ru.profile_picture AS real_user_profile_picture,
    fu.id AS fictional_user_id,
    fu.name AS fictional_user_name,
    fu.age AS fictional_user_age,
    fu.gender AS fictional_user_gender,
    fu.location AS fictional_user_location,
    fu.bio AS fictional_user_bio,
    fu.profile_pictures AS fictional_user_profile_pictures
  FROM chats c
  JOIN real_users ru ON c.real_user_id = ru.id
  JOIN fictional_users fu ON c.fictional_user_id = fu.id
  WHERE c.id = p_chat_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION assign_chat_to_operator IS 'Assigns oldest waiting chat to available operator with locking';
COMMENT ON FUNCTION release_and_reassign_chat IS 'Releases chat from operator and returns to queue, tracks reassignment count';
COMMENT ON FUNCTION get_available_fictional_profiles IS 'Returns fictional profiles matching user gender preference with favorite status';
COMMENT ON FUNCTION update_operator_stats IS 'Updates daily statistics for operator performance tracking';
COMMENT ON FUNCTION get_operator_performance_stats IS 'Returns comprehensive performance metrics for an operator';
COMMENT ON FUNCTION get_chat_with_details IS 'Returns complete chat information with user and profile details';
