-- Fantooo Platform Database Schema
-- Migration 002: Performance Indexes

-- ============================================================================
-- CHATS TABLE INDEXES
-- ============================================================================

-- Index for querying chats by real user
CREATE INDEX idx_chats_real_user ON chats(real_user_id);

-- Index for querying chats by fictional user
CREATE INDEX idx_chats_fictional_user ON chats(fictional_user_id);

-- Index for querying chats by assigned operator
CREATE INDEX idx_chats_operator ON chats(assigned_operator_id);

-- Index for filtering active chats
CREATE INDEX idx_chats_active ON chats(is_active) WHERE is_active = true;

-- Composite index for assignment queue (unassigned active chats ordered by creation)
CREATE INDEX idx_chats_assignment_queue ON chats(created_at ASC) 
  WHERE assigned_operator_id IS NULL AND is_active = true;

-- Index for finding idle chats (assigned chats with old assignment times)
CREATE INDEX idx_chats_idle_detection ON chats(assignment_time, assigned_operator_id)
  WHERE assigned_operator_id IS NOT NULL AND is_active = true;

-- ============================================================================
-- MESSAGES TABLE INDEXES
-- ============================================================================

-- Index for querying messages by chat
CREATE INDEX idx_messages_chat ON messages(chat_id);

-- Index for ordering messages by creation time (most recent first)
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Composite index for chat messages ordered by time
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at DESC);

-- Index for finding messages by operator
CREATE INDEX idx_messages_operator ON messages(handled_by_operator_id)
  WHERE handled_by_operator_id IS NOT NULL;

-- ============================================================================
-- REAL USERS TABLE INDEXES
-- ============================================================================

-- Index for email lookups (authentication)
CREATE INDEX idx_real_users_email ON real_users(email);

-- Index for name lookups (uniqueness validation)
CREATE INDEX idx_real_users_name ON real_users(name);

-- Index for filtering active users
CREATE INDEX idx_real_users_active ON real_users(is_active) WHERE is_active = true;

-- ============================================================================
-- FICTIONAL USERS TABLE INDEXES
-- ============================================================================

-- Composite index for filtering active fictional profiles by gender
CREATE INDEX idx_fictional_active_gender ON fictional_users(gender, is_active) 
  WHERE is_active = true;

-- Index for filtering active fictional profiles
CREATE INDEX idx_fictional_active ON fictional_users(is_active) WHERE is_active = true;

-- ============================================================================
-- FAVORITES TABLE INDEXES
-- ============================================================================

-- Index for querying favorites by real user
CREATE INDEX idx_favorites_user ON favorites(real_user_id);

-- Index for querying favorites by fictional user
CREATE INDEX idx_favorites_fictional ON favorites(fictional_user_id);

-- Composite index for checking if a specific favorite exists
CREATE INDEX idx_favorites_user_fictional ON favorites(real_user_id, fictional_user_id);

-- ============================================================================
-- TRANSACTIONS TABLE INDEXES
-- ============================================================================

-- Index for querying transactions by real user
CREATE INDEX idx_transactions_user ON transactions(real_user_id);

-- Index for ordering transactions by creation time
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- Index for Paystack reference lookups
CREATE INDEX idx_transactions_reference ON transactions(paystack_reference);

-- Composite index for user transactions ordered by time
CREATE INDEX idx_transactions_user_created ON transactions(real_user_id, created_at DESC);

-- Index for filtering by transaction status
CREATE INDEX idx_transactions_status ON transactions(status);

-- ============================================================================
-- OPERATORS TABLE INDEXES
-- ============================================================================

-- Index for email lookups (authentication)
CREATE INDEX idx_operators_email ON operators(email);

-- Index for filtering available operators
CREATE INDEX idx_operators_available ON operators(is_available, is_active)
  WHERE is_available = true AND is_active = true;

-- Index for filtering active operators
CREATE INDEX idx_operators_active ON operators(is_active) WHERE is_active = true;

-- ============================================================================
-- OPERATOR STATS TABLE INDEXES
-- ============================================================================

-- Composite index for querying operator stats by date range
CREATE INDEX idx_operator_stats_date ON operator_stats(operator_id, date DESC);

-- Index for date-based queries
CREATE INDEX idx_operator_stats_date_only ON operator_stats(date DESC);

-- ============================================================================
-- OPERATOR ACTIVITY TABLE INDEXES
-- ============================================================================

-- Index for querying activity by chat
CREATE INDEX idx_operator_activity_chat ON operator_activity(chat_id);

-- Index for querying activity by operator
CREATE INDEX idx_operator_activity_operator ON operator_activity(operator_id);

-- Index for finding stale activity (idle detection)
CREATE INDEX idx_operator_activity_last_activity ON operator_activity(last_activity);

-- ============================================================================
-- CHAT ASSIGNMENTS TABLE INDEXES
-- ============================================================================

-- Index for querying assignments by chat
CREATE INDEX idx_chat_assignments_chat ON chat_assignments(chat_id);

-- Index for querying assignments by operator
CREATE INDEX idx_chat_assignments_operator ON chat_assignments(operator_id);

-- Index for ordering assignments by time
CREATE INDEX idx_chat_assignments_assigned_at ON chat_assignments(assigned_at DESC);

-- Composite index for chat assignment history
CREATE INDEX idx_chat_assignments_chat_time ON chat_assignments(chat_id, assigned_at DESC);

-- ============================================================================
-- ADMINS TABLE INDEXES
-- ============================================================================

-- Index for email lookups (authentication)
CREATE INDEX idx_admins_email ON admins(email);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_chats_assignment_queue IS 'Optimizes queue retrieval for operator assignment';
COMMENT ON INDEX idx_chats_idle_detection IS 'Optimizes idle chat detection for reassignment';
COMMENT ON INDEX idx_messages_chat_created IS 'Optimizes message retrieval in chat interfaces';
COMMENT ON INDEX idx_fictional_active_gender IS 'Optimizes profile discovery filtering by gender preference';
COMMENT ON INDEX idx_operators_available IS 'Optimizes finding available operators for assignment';
