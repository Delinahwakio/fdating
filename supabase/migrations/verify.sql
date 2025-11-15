-- Fantooo Database Verification Script
-- Run this after applying migrations to verify everything is set up correctly

-- ============================================================================
-- VERIFY TABLES EXIST
-- ============================================================================

SELECT 
  'Tables Check' AS check_type,
  COUNT(*) AS count,
  CASE 
    WHEN COUNT(*) = 11 THEN '✓ PASS' 
    ELSE '✗ FAIL - Expected 11 tables' 
  END AS status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- List all tables
SELECT 
  'Table: ' || table_name AS detail
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================================================
-- VERIFY ROW LEVEL SECURITY IS ENABLED
-- ============================================================================

SELECT 
  'RLS Check' AS check_type,
  COUNT(*) AS count,
  CASE 
    WHEN COUNT(*) = 11 THEN '✓ PASS' 
    ELSE '✗ FAIL - Not all tables have RLS enabled' 
  END AS status
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- List tables without RLS
SELECT 
  'Missing RLS: ' || tablename AS detail
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;

-- ============================================================================
-- VERIFY INDEXES EXIST
-- ============================================================================

SELECT 
  'Indexes Check' AS check_type,
  COUNT(*) AS count,
  CASE 
    WHEN COUNT(*) >= 30 THEN '✓ PASS' 
    ELSE '✗ FAIL - Expected at least 30 indexes' 
  END AS status
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname NOT LIKE '%pkey';

-- ============================================================================
-- VERIFY RLS POLICIES EXIST
-- ============================================================================

SELECT 
  'RLS Policies Check' AS check_type,
  COUNT(*) AS count,
  CASE 
    WHEN COUNT(*) >= 40 THEN '✓ PASS' 
    ELSE '✗ FAIL - Expected at least 40 policies' 
  END AS status
FROM pg_policies 
WHERE schemaname = 'public';

-- Count policies per table
SELECT 
  tablename,
  COUNT(*) AS policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- VERIFY FUNCTIONS EXIST
-- ============================================================================

SELECT 
  'Functions Check' AS check_type,
  COUNT(*) AS count,
  CASE 
    WHEN COUNT(*) >= 10 THEN '✓ PASS' 
    ELSE '✗ FAIL - Expected at least 10 functions' 
  END AS status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';

-- List all functions
SELECT 
  'Function: ' || routine_name AS detail
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- ============================================================================
-- VERIFY TRIGGERS EXIST
-- ============================================================================

SELECT 
  'Triggers Check' AS check_type,
  COUNT(*) AS count,
  CASE 
    WHEN COUNT(*) >= 5 THEN '✓ PASS' 
    ELSE '✗ FAIL - Expected at least 5 triggers' 
  END AS status
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- List all triggers
SELECT 
  event_object_table AS table_name,
  trigger_name
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- VERIFY CONSTRAINTS
-- ============================================================================

-- Check constraints
SELECT 
  'CHECK Constraints' AS check_type,
  COUNT(*) AS count,
  CASE 
    WHEN COUNT(*) >= 15 THEN '✓ PASS' 
    ELSE '✗ FAIL - Expected at least 15 CHECK constraints' 
  END AS status
FROM information_schema.check_constraints 
WHERE constraint_schema = 'public';

-- Unique constraints
SELECT 
  'UNIQUE Constraints' AS check_type,
  COUNT(*) AS count,
  CASE 
    WHEN COUNT(*) >= 8 THEN '✓ PASS' 
    ELSE '✗ FAIL - Expected at least 8 UNIQUE constraints' 
  END AS status
FROM information_schema.table_constraints 
WHERE constraint_schema = 'public' 
AND constraint_type = 'UNIQUE';

-- Foreign key constraints
SELECT 
  'FOREIGN KEY Constraints' AS check_type,
  COUNT(*) AS count,
  CASE 
    WHEN COUNT(*) >= 15 THEN '✓ PASS' 
    ELSE '✗ FAIL - Expected at least 15 FOREIGN KEY constraints' 
  END AS status
FROM information_schema.table_constraints 
WHERE constraint_schema = 'public' 
AND constraint_type = 'FOREIGN KEY';

-- ============================================================================
-- TEST HELPER FUNCTIONS
-- ============================================================================

-- Test role detection functions (should return false when not authenticated)
SELECT 
  'Helper Functions Test' AS check_type,
  CASE 
    WHEN is_admin() = false 
    AND is_operator() = false 
    AND is_real_user() = false 
    THEN '✓ PASS - Functions return false for unauthenticated user' 
    ELSE '✗ FAIL - Helper functions not working correctly' 
  END AS status;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
  '===========================================' AS summary;
SELECT 
  'DATABASE VERIFICATION COMPLETE' AS summary;
SELECT 
  '===========================================' AS summary;
SELECT 
  'Review the results above.' AS summary;
SELECT 
  'All checks should show ✓ PASS status.' AS summary;
