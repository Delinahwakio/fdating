-- Fantooo Platform Database Schema
-- Migration 003: Row Level Security Policies

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE real_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE fictional_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS FOR ROLE DETECTION
-- ============================================================================

-- Check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is an operator
CREATE OR REPLACE FUNCTION is_operator()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM operators WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is a real user
CREATE OR REPLACE FUNCTION is_real_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM real_users WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- REAL USERS TABLE POLICIES
-- ============================================================================

-- Real users can view their own profile
CREATE POLICY "Users can view own profile"
  ON real_users FOR SELECT
  USING (auth.uid() = id);

-- Real users can update their own profile
CREATE POLICY "Users can update own profile"
  ON real_users FOR UPDATE
  USING (auth.uid() = id);

-- Real users can insert their own profile (during registration)
CREATE POLICY "Users can insert own profile"
  ON real_users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Operators can view real user profiles for assigned chats
CREATE POLICY "Operators can view assigned chat users"
  ON real_users FOR SELECT
  USING (
    is_operator() AND EXISTS (
      SELECT 1 FROM chats
      WHERE chats.real_user_id = real_users.id
      AND chats.assigned_operator_id = auth.uid()
    )
  );

-- Admins can view all real users
CREATE POLICY "Admins can view all users"
  ON real_users FOR SELECT
  USING (is_admin());

-- Admins can update any real user (for moderation)
CREATE POLICY "Admins can update all users"
  ON real_users FOR UPDATE
  USING (is_admin());

-- ============================================================================
-- FICTIONAL USERS TABLE POLICIES
-- ============================================================================

-- Real users can view active fictional profiles
CREATE POLICY "Users can view active fictional profiles"
  ON fictional_users FOR SELECT
  USING (is_active = true AND is_real_user());

-- Operators can view all fictional profiles
CREATE POLICY "Operators can view all fictional profiles"
  ON fictional_users FOR SELECT
  USING (is_operator());

-- Admins have full access to fictional profiles
CREATE POLICY "Admins can manage fictional profiles"
  ON fictional_users FOR ALL
  USING (is_admin());

-- ============================================================================
-- CHATS TABLE POLICIES
-- ============================================================================

-- Real users can view their own chats
CREATE POLICY "Users can view own chats"
  ON chats FOR SELECT
  USING (real_user_id = auth.uid() AND is_real_user());

-- Real users can create chats
CREATE POLICY "Users can create chats"
  ON chats FOR INSERT
  WITH CHECK (real_user_id = auth.uid() AND is_real_user());

-- Operators can view assigned chats
CREATE POLICY "Operators can view assigned chats"
  ON chats FOR SELECT
  USING (assigned_operator_id = auth.uid() AND is_operator());

-- Operators can update notes in assigned chats
CREATE POLICY "Operators can update assigned chat notes"
  ON chats FOR UPDATE
  USING (assigned_operator_id = auth.uid() AND is_operator())
  WITH CHECK (assigned_operator_id = auth.uid() AND is_operator());

-- Admins have full access to all chats
CREATE POLICY "Admins can manage all chats"
  ON chats FOR ALL
  USING (is_admin());

-- System can update chats for assignment (via service role)
CREATE POLICY "System can update chats for assignment"
  ON chats FOR UPDATE
  USING (true);

-- ============================================================================
-- MESSAGES TABLE POLICIES
-- ============================================================================

-- Real users can view messages in their chats
CREATE POLICY "Users can view own chat messages"
  ON messages FOR SELECT
  USING (
    is_real_user() AND EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.real_user_id = auth.uid()
    )
  );

-- Real users can insert messages in their chats
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    is_real_user() AND 
    sender_type = 'real' AND
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.real_user_id = auth.uid()
    )
  );

-- Operators can view messages in assigned chats
CREATE POLICY "Operators can view assigned chat messages"
  ON messages FOR SELECT
  USING (
    is_operator() AND EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.assigned_operator_id = auth.uid()
    )
  );

-- Operators can insert messages as fictional users in assigned chats
CREATE POLICY "Operators can send messages as fictional"
  ON messages FOR INSERT
  WITH CHECK (
    is_operator() AND
    sender_type = 'fictional' AND
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.assigned_operator_id = auth.uid()
    )
  );

-- Operators can update message delivery/read status
CREATE POLICY "Operators can update message status"
  ON messages FOR UPDATE
  USING (
    is_operator() AND EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.assigned_operator_id = auth.uid()
    )
  );

-- Admins have full access to all messages
CREATE POLICY "Admins can manage all messages"
  ON messages FOR ALL
  USING (is_admin());

-- ============================================================================
-- FAVORITES TABLE POLICIES
-- ============================================================================

-- Real users can view their own favorites
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (real_user_id = auth.uid() AND is_real_user());

-- Real users can add favorites
CREATE POLICY "Users can add favorites"
  ON favorites FOR INSERT
  WITH CHECK (real_user_id = auth.uid() AND is_real_user());

-- Real users can remove their favorites
CREATE POLICY "Users can remove favorites"
  ON favorites FOR DELETE
  USING (real_user_id = auth.uid() AND is_real_user());

-- Admins can view all favorites
CREATE POLICY "Admins can view all favorites"
  ON favorites FOR SELECT
  USING (is_admin());

-- ============================================================================
-- TRANSACTIONS TABLE POLICIES
-- ============================================================================

-- Real users can view their own transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (real_user_id = auth.uid() AND is_real_user());

-- System can insert transactions (via service role for webhooks)
CREATE POLICY "System can create transactions"
  ON transactions FOR INSERT
  WITH CHECK (true);

-- System can update transactions (via service role for webhooks)
CREATE POLICY "System can update transactions"
  ON transactions FOR UPDATE
  USING (true);

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
  ON transactions FOR SELECT
  USING (is_admin());

-- ============================================================================
-- OPERATORS TABLE POLICIES
-- ============================================================================

-- Operators can view their own profile
CREATE POLICY "Operators can view own profile"
  ON operators FOR SELECT
  USING (id = auth.uid() AND is_operator());

-- Operators can update their own availability and activity
CREATE POLICY "Operators can update own status"
  ON operators FOR UPDATE
  USING (id = auth.uid() AND is_operator());

-- Admins have full access to operators
CREATE POLICY "Admins can manage operators"
  ON operators FOR ALL
  USING (is_admin());

-- System can update operator stats (via service role)
CREATE POLICY "System can update operator stats"
  ON operators FOR UPDATE
  USING (true);

-- ============================================================================
-- ADMINS TABLE POLICIES
-- ============================================================================

-- Admins can view all admins
CREATE POLICY "Admins can view all admins"
  ON admins FOR SELECT
  USING (is_admin());

-- Super admins can manage other admins
CREATE POLICY "Super admins can manage admins"
  ON admins FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE id = auth.uid() 
      AND is_super_admin = true
    )
  );

-- ============================================================================
-- OPERATOR STATS TABLE POLICIES
-- ============================================================================

-- Operators can view their own stats
CREATE POLICY "Operators can view own stats"
  ON operator_stats FOR SELECT
  USING (operator_id = auth.uid() AND is_operator());

-- System can insert/update operator stats (via service role)
CREATE POLICY "System can manage operator stats"
  ON operator_stats FOR ALL
  USING (true);

-- Admins can view all operator stats
CREATE POLICY "Admins can view all operator stats"
  ON operator_stats FOR SELECT
  USING (is_admin());

-- ============================================================================
-- OPERATOR ACTIVITY TABLE POLICIES
-- ============================================================================

-- Operators can view their own activity
CREATE POLICY "Operators can view own activity"
  ON operator_activity FOR SELECT
  USING (operator_id = auth.uid() AND is_operator());

-- Operators can update their own activity
CREATE POLICY "Operators can update own activity"
  ON operator_activity FOR INSERT
  WITH CHECK (operator_id = auth.uid() AND is_operator());

CREATE POLICY "Operators can modify own activity"
  ON operator_activity FOR UPDATE
  USING (operator_id = auth.uid() AND is_operator());

-- System can manage operator activity (via service role for idle detection)
CREATE POLICY "System can manage operator activity"
  ON operator_activity FOR ALL
  USING (true);

-- Admins can view all operator activity
CREATE POLICY "Admins can view all operator activity"
  ON operator_activity FOR SELECT
  USING (is_admin());

-- ============================================================================
-- CHAT ASSIGNMENTS TABLE POLICIES
-- ============================================================================

-- Operators can view their own assignment history
CREATE POLICY "Operators can view own assignments"
  ON chat_assignments FOR SELECT
  USING (operator_id = auth.uid() AND is_operator());

-- System can manage chat assignments (via service role)
CREATE POLICY "System can manage chat assignments"
  ON chat_assignments FOR ALL
  USING (true);

-- Admins can view all chat assignments
CREATE POLICY "Admins can view all assignments"
  ON chat_assignments FOR SELECT
  USING (is_admin());

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "Users can view own profile" ON real_users IS 'Real users can only access their own profile data';
COMMENT ON POLICY "Operators can view assigned chat users" ON real_users IS 'Operators can view profiles of users in their assigned chats';
COMMENT ON POLICY "Users can send messages" ON messages IS 'Real users can only send messages as themselves in their own chats';
COMMENT ON POLICY "Operators can send messages as fictional" ON messages IS 'Operators send messages as fictional users in assigned chats';
COMMENT ON POLICY "System can create transactions" ON transactions IS 'Allows Paystack webhooks to create transaction records';
