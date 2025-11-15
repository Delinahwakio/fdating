-- Fantooo Platform Database Schema
-- Migration 005: Moderation Actions Table

-- ============================================================================
-- MODERATION ACTIONS TABLE
-- ============================================================================
CREATE TABLE moderation_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  real_user_id UUID REFERENCES real_users(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES admins(id) ON DELETE SET NULL NOT NULL,
  action_type TEXT CHECK (action_type IN ('block', 'unblock', 'suspend', 'warning')) NOT NULL,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_moderation_actions_user ON moderation_actions(real_user_id, created_at DESC);
CREATE INDEX idx_moderation_actions_admin ON moderation_actions(admin_id, created_at DESC);

-- Comment for documentation
COMMENT ON TABLE moderation_actions IS 'Historical record of all moderation actions taken by admins on real users';
