#!/bin/bash

# Fantooo Platform - Database Verification Script
# This script verifies that all database components are properly set up

set -e  # Exit on error

echo "🔍 Fantooo Platform - Database Verification"
echo "==========================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "❌ Project not linked to Supabase"
    echo "Run: supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

echo "✅ Project linked"
echo ""

# Run verification SQL
echo "📊 Checking database schema..."
echo ""

if [ -f "supabase/migrations/verify.sql" ]; then
    supabase db execute -f supabase/migrations/verify.sql
else
    echo "⚠️  Verification script not found at supabase/migrations/verify.sql"
fi

echo ""
echo "🔍 Checking RLS policies..."
echo ""

# Check if RLS is enabled on all tables
supabase db execute <<SQL
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
SQL

echo ""
echo "🔍 Checking database functions..."
echo ""

# List all custom functions
supabase db execute <<SQL
SELECT 
    routine_name as function_name,
    '✅ Exists' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
SQL

echo ""
echo "🔍 Checking indexes..."
echo ""

# List all indexes
supabase db execute <<SQL
SELECT 
    schemaname,
    tablename,
    indexname,
    '✅ Created' as status
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
SQL

echo ""
echo "✅ Verification complete!"
echo ""
echo "Manual checks required:"
echo "1. Go to Supabase Dashboard → Database → Replication"
echo "2. Verify Realtime is enabled for: messages, chats, operator_stats, operator_activity"
echo "3. Go to Settings → Database"
echo "4. Copy Connection Pooling URL and add to environment variables"
echo ""
