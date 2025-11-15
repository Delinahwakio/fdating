-- Fantooo Platform Database Schema
-- Migration 001: Initial Schema with Tables and Constraints

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ADMINS TABLE
-- ============================================================================
CREATE TABLE admins (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_super_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- OPERATORS TABLE
-- ============================================================================
CREATE TABLE operators (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT false,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  total_messages INTEGER DEFAULT 0 CHECK (total_messages >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL
);

-- ============================================================================
-- REAL USERS TABLE
-- ============================================================================
CREATE TABLE real_users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  gender TEXT CHECK (gender IN ('male', 'female')) NOT NULL,
  looking_for TEXT CHECK (looking_for IN ('male', 'female')) NOT NULL,
  age INTEGER CHECK (age >= 18 AND age <= 100) NOT NULL,
  profile_picture TEXT,
  credits INTEGER DEFAULT 0 CHECK (credits >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FICTIONAL USERS TABLE
-- ============================================================================
CREATE TABLE fictional_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  age INTEGER CHECK (age >= 18 AND age <= 100) NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')) NOT NULL,
  location TEXT NOT NULL,
  bio TEXT,
  profile_pictures TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL
);

-- ============================================================================
-- CHATS TABLE
-- ============================================================================
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  real_user_id UUID REFERENCES real_users(id) ON DELETE CASCADE NOT NULL,
  fictional_user_id UUID REFERENCES fictional_users(id) ON DELETE CASCADE NOT NULL,
  real_profile_notes TEXT DEFAULT '',
  fictional_profile_notes TEXT DEFAULT '',
  message_count INTEGER DEFAULT 0 CHECK (message_count >= 0),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
  assignment_time TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(real_user_id, fictional_user_id)
);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT CHECK (sender_type IN ('real', 'fictional')) NOT NULL,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 5000),
  handled_by_operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
  is_free_message BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

-- ============================================================================
-- FAVORITES TABLE
-- ============================================================================
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  real_user_id UUID REFERENCES real_users(id) ON DELETE CASCADE NOT NULL,
  fictional_user_id UUID REFERENCES fictional_users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(real_user_id, fictional_user_id)
);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  real_user_id UUID REFERENCES real_users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  credits_purchased INTEGER NOT NULL CHECK (credits_purchased > 0),
  paystack_reference TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- OPERATOR STATS TABLE
-- ============================================================================
CREATE TABLE operator_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID REFERENCES operators(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  messages_sent INTEGER DEFAULT 0 CHECK (messages_sent >= 0),
  chats_handled INTEGER DEFAULT 0 CHECK (chats_handled >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(operator_id, date)
);

-- ============================================================================
-- OPERATOR ACTIVITY TABLE (for idle detection)
-- ============================================================================
CREATE TABLE operator_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  operator_id UUID REFERENCES operators(id) ON DELETE CASCADE NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_id, operator_id)
);

-- ============================================================================
-- CHAT ASSIGNMENTS HISTORY TABLE
-- ============================================================================
CREATE TABLE chat_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  operator_id UUID REFERENCES operators(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  release_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to real_users
CREATE TRIGGER update_real_users_updated_at
  BEFORE UPDATE ON real_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to chats
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to operator_activity
CREATE TRIGGER update_operator_activity_updated_at
  BEFORE UPDATE ON operator_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE real_users IS 'Authenticated users who chat with fictional profiles';
COMMENT ON TABLE fictional_users IS 'Fictional profiles managed by operators';
COMMENT ON TABLE operators IS 'Staff members who handle conversations as fictional profiles';
COMMENT ON TABLE admins IS 'Platform administrators with full access';
COMMENT ON TABLE chats IS 'Active conversations between real users and fictional profiles';
COMMENT ON TABLE messages IS 'Individual messages within chats';
COMMENT ON TABLE favorites IS 'Real users favorite fictional profiles';
COMMENT ON TABLE transactions IS 'Credit purchase transactions via Paystack';
COMMENT ON TABLE operator_stats IS 'Daily performance statistics for operators';
COMMENT ON TABLE operator_activity IS 'Activity tracking for idle detection';
COMMENT ON TABLE chat_assignments IS 'Historical record of chat assignments and reassignments';
