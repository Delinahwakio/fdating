# Fantooo Platform - Database Migration Deployment Script (PowerShell)
# This script deploys all database migrations to Supabase

$ErrorActionPreference = "Stop"

Write-Host "🚀 Fantooo Platform - Database Migration Deployment" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
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
    Write-Host "⚠️  Project not linked to Supabase" -ForegroundColor Yellow
    Write-Host ""
    $projectRef = Read-Host "Enter your Supabase project reference (e.g., abcdefghijklmnop)"
    
    if ([string]::IsNullOrWhiteSpace($projectRef)) {
        Write-Host "❌ Project reference is required" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "🔗 Linking to Supabase project..." -ForegroundColor Cyan
    supabase link --project-ref $projectRef
    Write-Host "✅ Project linked successfully" -ForegroundColor Green
    Write-Host ""
}

# Show current migration status
Write-Host "📊 Current migration status:" -ForegroundColor Cyan
supabase migration list
Write-Host ""

# Confirm deployment
$confirm = Read-Host "Do you want to deploy migrations to production? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🔄 Deploying migrations..." -ForegroundColor Cyan
Write-Host ""

# Push migrations to Supabase
supabase db push

Write-Host ""
Write-Host "✅ Migrations deployed successfully!" -ForegroundColor Green
Write-Host ""

# Run verification
Write-Host "🔍 Running verification checks..." -ForegroundColor Cyan
Write-Host ""

# Check if verification script exists
if (Test-Path "supabase/migrations/verify.sql") {
    Write-Host "Running verification script..." -ForegroundColor Cyan
    supabase db execute -f supabase/migrations/verify.sql
    Write-Host ""
}

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify RLS policies are active in Supabase Dashboard"
Write-Host "2. Test database functions"
Write-Host "3. Enable Realtime for required tables"
Write-Host "4. Set up connection pooling"
Write-Host ""
