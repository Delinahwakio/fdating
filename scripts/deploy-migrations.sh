#!/bin/bash

# Fantooo Platform - Database Migration Deployment Script
# This script deploys all database migrations to Supabase

set -e  # Exit on error

echo "🚀 Fantooo Platform - Database Migration Deployment"
echo "=================================================="
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
    echo "⚠️  Project not linked to Supabase"
    echo ""
    read -p "Enter your Supabase project reference (e.g., abcdefghijklmnop): " PROJECT_REF
    
    if [ -z "$PROJECT_REF" ]; then
        echo "❌ Project reference is required"
        exit 1
    fi
    
    echo "🔗 Linking to Supabase project..."
    supabase link --project-ref "$PROJECT_REF"
    echo "✅ Project linked successfully"
    echo ""
fi

# Show current migration status
echo "📊 Current migration status:"
supabase migration list
echo ""

# Confirm deployment
read -p "Do you want to deploy migrations to production? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo ""
echo "🔄 Deploying migrations..."
echo ""

# Push migrations to Supabase
supabase db push

echo ""
echo "✅ Migrations deployed successfully!"
echo ""

# Run verification
echo "🔍 Running verification checks..."
echo ""

# Check if verification script exists
if [ -f "supabase/migrations/verify.sql" ]; then
    echo "Running verification script..."
    supabase db execute -f supabase/migrations/verify.sql
    echo ""
fi

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Verify RLS policies are active in Supabase Dashboard"
echo "2. Test database functions"
echo "3. Enable Realtime for required tables"
echo "4. Set up connection pooling"
echo ""
