-- Fix RLS policies to allow users to check their own role
-- This fixes the infinite recursion issue when logging in

-- Drop existing problematic policies on admins table
DROP POLICY IF EXISTS "Admins can view all admins" ON admins;
DROP POLICY IF EXISTS "Admins can insert admins" ON admins;
DROP POLICY IF EXISTS "Admins can update admins" ON admins;
DROP POLICY IF EXISTS "Admins can delete admins" ON admins;

-- Allow users to check if THEY are an admin (for middleware role checking)
CREATE POLICY "Users can view their own admin status"
  ON admins FOR SELECT
  USING (auth.uid() = id);

-- Allow admins to view all admins (but this requires them to already be identified as admin)
CREATE POLICY "Admins can view all admins"
  ON admins FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM admins)
  );

-- Allow admins to manage other admins
CREATE POLICY "Admins can insert admins"
  ON admins FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM admins WHERE is_super_admin = true)
  );

CREATE POLICY "Admins can update admins"
  ON admins FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM admins WHERE is_super_admin = true)
  );

CREATE POLICY "Admins can delete admins"
  ON admins FOR DELETE
  USING (
    auth.uid() IN (SELECT id FROM admins WHERE is_super_admin = true)
  );
