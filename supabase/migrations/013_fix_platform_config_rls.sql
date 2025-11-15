-- Fix platform_config RLS to allow reading maintenance_mode without being admin
-- This prevents the chicken-and-egg problem where we need to check maintenance mode
-- before we can determine if someone is an admin

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view configuration" ON platform_config;
DROP POLICY IF EXISTS "Admins can update configuration" ON platform_config;

-- Allow anyone (even unauthenticated) to read maintenance_mode
-- This is safe because it's just a boolean flag
CREATE POLICY "Anyone can read maintenance mode"
  ON platform_config FOR SELECT
  USING (key = 'maintenance_mode');

-- Allow authenticated users to read all config (for UI display)
CREATE POLICY "Authenticated users can read config"
  ON platform_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can update configuration
CREATE POLICY "Admins can update configuration"
  ON platform_config FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

-- Only admins can insert configuration
CREATE POLICY "Admins can insert configuration"
  ON platform_config FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

COMMENT ON POLICY "Anyone can read maintenance mode" ON platform_config IS 
  'Allows checking maintenance mode without authentication - required for middleware';
