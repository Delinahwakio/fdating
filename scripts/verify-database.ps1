# Fantooo Platform - Database Verification Script (PowerShell)
# This script verifies that all database components are properly set up

$ErrorActionPreference = "Stop"

Write-Host "🔍 Fantooo Platform - Database Verification" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
try {
    $null = Get-Command supabase -ErrorAction Stop
    Write-Host "✅ Supabase CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI is not installed" -ForegroundColor Red
    Write-Host "Install it with: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check if project is linked
if (-not (Test-Path ".supabase/config.toml")) {
    Write-Host "❌ Project not linked to Supabase" -ForegroundColor Red
    Write-Host "Run: supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Project linked" -ForegroundColor Green
Write-Host ""

# Run verification SQL
Write-Host "📊 Checking database schema..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path "supabase/migrations/verify.sql") {
    supabase db execute -f supabase/migrations/verify.sql
} else {
    Write-Host "⚠️  Verification script not found at supabase/migrations/verify.sql" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔍 Checking RLS policies..." -ForegroundColor Cyan
Write-Host ""

# Check if RLS is enabled on all tables
$rlsCheck = @"
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
"@

$rlsCheck | supabase db execute

Write-Host ""
Write-Host "🔍 Checking database functions..." -ForegroundColor Cyan
Write-Host ""

# List all custom functions
$functionsCheck = @"
SELECT 
    routine_name as function_name,
    '✅ Exists' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
"@

$functionsCheck | supabase db execute

Write-Host ""
Write-Host "🔍 Checking indexes..." -ForegroundColor Cyan
Write-Host ""

# List all indexes
$indexesCheck = @"
SELECT 
    schemaname,
    tablename,
    indexname,
    '✅ Created' as status
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
"@

$indexesCheck | supabase db execute

Write-Host ""
Write-Host "✅ Verification complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Manual checks required:" -ForegroundColor Yellow
Write-Host "1. Go to Supabase Dashboard → Database → Replication"
Write-Host "2. Verify Realtime is enabled for: messages, chats, operator_stats, operator_activity"
Write-Host "3. Go to Settings → Database"
Write-Host "4. Copy Connection Pooling URL and add to environment variables"
Write-Host ""
