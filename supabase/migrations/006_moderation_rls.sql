-- Fantooo Platform Database Schema
-- Migration 006: RLS Policies for Moderation Actions

-- Enable RLS on moderation_actions table
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- MODERATION ACTIONS TABLE POLICIES
-- ============================================================================

-- Admins can view all moderation actions
CREATE POLICY "Admins can view all moderation actions"
  ON moderation_actions FOR SELECT
  USING (is_admin());

-- Admins can insert moderation actions
CREATE POLICY "Admins can create moderation actions"
  ON moderation_actions FOR INSERT
  WITH CHECK (is_admin() AND admin_id = auth.uid());

-- Admins can update their own moderation actions (e.g., to add notes)
CREATE POLICY "Admins can update own moderation actions"
  ON moderation_actions FOR UPDATE
  USING (is_admin() AND admin_id = auth.uid());

-- Comments for documentation
COMMENT ON POLICY "Admins can view all moderation actions" ON moderation_actions IS 'Admins can view the complete moderation history for all users';
COMMENT ON POLICY "Admins can create moderation actions" ON moderation_actions IS 'Admins can log moderation actions they perform';
