-- Fantooo Platform Database Schema
-- Migration 014: Chat State Management System
-- Purpose: Fix chat assignment logic with proper state tracking

-- ============================================================================
-- STEP 1: Add new columns to chats table
-- ============================================================================

-- Add chat_state column to track the current state of the chat
ALTER TABLE chats ADD COLUMN IF NOT EXISTS chat_state TEXT 
CHECK (chat_state IN ('waiting_assignment', 'assigned', 'waiting_real_user_reply', 'completed')) 
DEFAULT 'waiting_assignment';

-- Add last_operator_id to track who last handled the chat (prevents same operator reassignment)
ALTER TABLE chats ADD COLUMN IF NOT EXISTS last_operator_id UUID REFERENCES operators(id) ON DELETE SET NULL;

-- Add operator_replied_at to track when operator last replied
ALTER TABLE chats ADD COLUMN IF NOT EXISTS operator_replied_at TIMESTAMPTZ;

-- ============================================================================
-- STEP 2: Set initial states for existing chats
-- ============================================================================

-- Chats with assigned operators are in 'assigned' state
UPDATE chats 
SET chat_state = 'assigned',
    last_operator_id = assigned_operator_id
WHERE assigned_operator_id IS NOT NULL 
AND is_active = true;

-- Chats without assigned operators need to check last message
-- If last message is from real user, state is 'waiting_assignment'
-- If last message is from fictional user, state is 'waiting_real_user_reply'
UPDATE chats c
SET chat_state = CASE 
    WHEN (
        SELECT sender_type 
        FROM messages 
        WHERE chat_id = c.id 
        ORDER BY created_at DESC 
        LIMIT 1
    ) = 'real' THEN 'waiting_assignment'
    WHEN (
        SELECT sender_type 
        FROM messages 
        WHERE chat_id = c.id 
        ORDER BY created_at DESC 
        LIMIT 1
    ) = 'fictional' THEN 'waiting_real_user_reply'
    ELSE 'waiting_assignment'
END,
last_operator_id = (
    SELECT handled_by_operator_id 
    FROM messages 
    WHERE chat_id = c.id 
    AND sender_type = 'fictional'
    ORDER BY created_at DESC 
    LIMIT 1
),
operator_replied_at = (
    SELECT created_at 
    FROM messages 
    WHERE chat_id = c.id 
    AND sender_type = 'fictional'
    ORDER BY created_at DESC 
    LIMIT 1
)
WHERE assigned_operator_id IS NULL 
AND is_active = true;

-- ============================================================================
-- STEP 3: Create index for efficient state-based queries
-- ============================================================================

-- Index for finding chats waiting for assignment
CREATE INDEX IF NOT EXISTS idx_chats_waiting_assignment 
ON chats (created_at) 
WHERE chat_state = 'waiting_assignment' AND is_active = true;

-- Index for finding chats by last operator
CREATE INDEX IF NOT EXISTS idx_chats_last_operator 
ON chats (last_operator_id, chat_state) 
WHERE is_active = true;

-- Index for operator replied timestamp
CREATE INDEX IF NOT EXISTS idx_chats_operator_replied 
ON chats (operator_replied_at) 
WHERE chat_state = 'waiting_real_user_reply';

-- ============================================================================
-- STEP 4: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN chats.chat_state IS 'Current state: waiting_assignment (needs operator), assigned (operator working), waiting_real_user_reply (operator replied), completed (chat ended)';
COMMENT ON COLUMN chats.last_operator_id IS 'Last operator who handled this chat, used to prevent immediate reassignment to same operator';
COMMENT ON COLUMN chats.operator_replied_at IS 'Timestamp when operator last sent a message in this chat';

