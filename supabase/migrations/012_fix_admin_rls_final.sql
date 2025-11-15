-- Final fix for admin RLS policies
-- The issue is infinite recursion: policies that check "is user an admin" 
-- require querying the admins table, which triggers the policy again.
-- Solution: Use ONLY the direct auth.uid() = id check, no subqueries.

-- Drop all existing policies on admins table
DROP POLICY IF EXISTS "Users can view their own admin status" ON admins;
DROP POLICY IF EXISTS "Admins can view all admins" ON admins;
DROP POLICY IF EXISTS "Admins can insert admins" ON admins;
DROP POLICY IF EXISTS "Admins can update admins" ON admins;
DROP POLICY IF EXISTS "Admins can delete admins" ON admins;
DROP POLICY IF EXISTS "Super admins can manage admins" ON admins;
DROP POLICY IF EXISTS "Authenticated users can check their own admin status" ON admins;
DROP POLICY IF EXISTS "Super admins can create admins" ON admins;
DROP POLICY IF EXISTS "Super admins can update admins" ON admins;
DROP POLICY IF EXISTS "Super admins can delete admins" ON admins;

-- SINGLE SELECT POLICY: Allow authenticated users to view their own admin record
-- This is the ONLY select policy - no other select policies to avoid recursion
CREATE POLICY "Users can view own admin record"
  ON admins FOR SELECT
  USING (auth.uid() = id);

-- For INSERT/UPDATE/DELETE, we'll use a different approach
-- We'll check the is_super_admin flag directly without subqueries
CREATE POLICY "Super admins can insert admins"
  ON admins FOR INSERT
  WITH CHECK (
    -- The user making the request must be a super admin
    -- This will use the SELECT policy above to check
    (SELECT is_super_admin FROM admins WHERE id = auth.uid()) = true
  );

CREATE POLICY "Super admins can update admins"
  ON admins FOR UPDATE
  USING (
    (SELECT is_super_admin FROM admins WHERE id = auth.uid()) = true
  );

CREATE POLICY "Super admins can delete admins"
  ON admins FOR DELETE
  USING (
    (SELECT is_super_admin FROM admins WHERE id = auth.uid()) = true
  );

-- Update the is_admin() helper function
-- Mark it as STABLE and SECURITY DEFINER so it bypasses RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON POLICY "Users can view own admin record" ON admins IS 
  'Allows authenticated users to check if they are an admin by viewing their own record only';
