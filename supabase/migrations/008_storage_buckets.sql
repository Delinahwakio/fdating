-- Fantooo Platform Storage Buckets
-- Migration 008: Create Storage Buckets and Policies

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create bucket for real user profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'real-user-profiles',
  'real-user-profiles',
  true, -- Public bucket for profile pictures
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for fictional user profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fictional-user-profiles',
  'fictional-user-profiles',
  true, -- Public bucket for profile pictures
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES FOR REAL USER PROFILES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Real users can upload their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Real users can update their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Real users can delete their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Public can view real user profile pictures" ON storage.objects;

-- Allow authenticated real users to upload their own profile pictures
CREATE POLICY "Real users can upload their own profile pictures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'real-user-profiles' 
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.real_users 
    WHERE id = auth.uid()
  )
);

-- Allow authenticated real users to update their own profile pictures
CREATE POLICY "Real users can update their own profile pictures"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'real-user-profiles' 
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.real_users 
    WHERE id = auth.uid()
  )
);

-- Allow authenticated real users to delete their own profile pictures
CREATE POLICY "Real users can delete their own profile pictures"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'real-user-profiles' 
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.real_users 
    WHERE id = auth.uid()
  )
);

-- Allow public read access to real user profile pictures
CREATE POLICY "Public can view real user profile pictures"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'real-user-profiles');

-- ============================================================================
-- STORAGE POLICIES FOR FICTIONAL USER PROFILES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can upload fictional user profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update fictional user profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete fictional user profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Public can view fictional user profile pictures" ON storage.objects;

-- Allow admins to upload fictional user profile pictures
CREATE POLICY "Admins can upload fictional user profile pictures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'fictional-user-profiles'
  AND EXISTS (
    SELECT 1 FROM public.admins 
    WHERE id = auth.uid()
  )
);

-- Allow admins to update fictional user profile pictures
CREATE POLICY "Admins can update fictional user profile pictures"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'fictional-user-profiles'
  AND EXISTS (
    SELECT 1 FROM public.admins 
    WHERE id = auth.uid()
  )
);

-- Allow admins to delete fictional user profile pictures
CREATE POLICY "Admins can delete fictional user profile pictures"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'fictional-user-profiles'
  AND EXISTS (
    SELECT 1 FROM public.admins 
    WHERE id = auth.uid()
  )
);

-- Allow public read access to fictional user profile pictures
CREATE POLICY "Public can view fictional user profile pictures"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'fictional-user-profiles');

-- ============================================================================
-- HELPER FUNCTIONS FOR STORAGE
-- ============================================================================

-- Function to get the public URL for a storage object
CREATE OR REPLACE FUNCTION get_storage_public_url(bucket_name TEXT, file_path TEXT)
RETURNS TEXT AS $$
DECLARE
  project_url TEXT;
BEGIN
  -- Get the Supabase project URL from settings
  -- In production, this should be set via environment variable
  project_url := current_setting('app.settings.supabase_url', true);
  
  IF project_url IS NULL THEN
    -- Fallback to constructing URL from request
    project_url := current_setting('request.headers', true)::json->>'host';
  END IF;
  
  RETURN project_url || '/storage/v1/object/public/' || bucket_name || '/' || file_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete old profile picture when updating
CREATE OR REPLACE FUNCTION delete_old_profile_picture()
RETURNS TRIGGER AS $$
DECLARE
  old_file_path TEXT;
BEGIN
  -- Extract file path from old URL if it exists
  IF OLD.profile_picture IS NOT NULL AND OLD.profile_picture != NEW.profile_picture THEN
    -- Extract the file path from the URL
    old_file_path := regexp_replace(
      OLD.profile_picture, 
      '^.*/storage/v1/object/public/real-user-profiles/', 
      ''
    );
    
    -- Delete the old file from storage
    DELETE FROM storage.objects 
    WHERE bucket_id = 'real-user-profiles' 
    AND name = old_file_path;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically delete old profile pictures
DROP TRIGGER IF EXISTS cleanup_old_real_user_profile_picture ON real_users;
CREATE TRIGGER cleanup_old_real_user_profile_picture
  AFTER UPDATE OF profile_picture ON real_users
  FOR EACH ROW
  WHEN (OLD.profile_picture IS DISTINCT FROM NEW.profile_picture)
  EXECUTE FUNCTION delete_old_profile_picture();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION get_storage_public_url IS 'Generates public URL for storage objects';
COMMENT ON FUNCTION delete_old_profile_picture IS 'Automatically deletes old profile pictures when updated';

-- ============================================================================
-- STORAGE BUCKET STRUCTURE
-- ============================================================================

-- Real user profiles structure:
-- real-user-profiles/
--   {user_id}/
--     profile.jpg (or .png, .webp)

-- Fictional user profiles structure:
-- fictional-user-profiles/
--   {fictional_user_id}/
--     1.jpg
--     2.jpg
--     3.jpg
--     ...

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Upload a real user profile picture:
-- 1. Client uploads to: real-user-profiles/{user_id}/profile.jpg
-- 2. Get public URL: https://[project].supabase.co/storage/v1/object/public/real-user-profiles/{user_id}/profile.jpg
-- 3. Store URL in real_users.profile_picture

-- Upload fictional user profile pictures:
-- 1. Admin uploads to: fictional-user-profiles/{fictional_user_id}/1.jpg
-- 2. Get public URL: https://[project].supabase.co/storage/v1/object/public/fictional-user-profiles/{fictional_user_id}/1.jpg
-- 3. Add URL to fictional_users.profile_pictures array

-- ============================================================================
-- STORAGE BUCKET STRUCTURE
-- ============================================================================

-- Real user profiles structure:
-- real-user-profiles/
--   {user_id}/
--     profile.jpg (or .png, .webp)

-- Fictional user profiles structure:
-- fictional-user-profiles/
--   {fictional_user_id}/
--     1.jpg
--     2.jpg
--     3.jpg
--     ...

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Upload a real user profile picture:
-- 1. Client uploads to: real-user-profiles/{user_id}/profile.jpg
-- 2. Get public URL: https://[project].supabase.co/storage/v1/object/public/real-user-profiles/{user_id}/profile.jpg
-- 3. Store URL in real_users.profile_picture

-- Upload fictional user profile pictures:
-- 1. Admin uploads to: fictional-user-profiles/{fictional_user_id}/1.jpg
-- 2. Get public URL: https://[project].supabase.co/storage/v1/object/public/fictional-user-profiles/{fictional_user_id}/1.jpg
-- 3. Add URL to fictional_users.profile_pictures array
