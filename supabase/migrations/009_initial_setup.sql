-- Initial Setup Configuration
-- Adds system setup tracking and admin creation function

-- Add setup tracking to platform_config
INSERT INTO platform_config (key, value, description) VALUES
  ('system_initialized', 'false', 'Whether the initial admin has been created')
ON CONFLICT (key) DO NOTHING;

-- Function to check if any admin exists
CREATE OR REPLACE FUNCTION has_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admins LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create initial admin (bypasses RLS)
CREATE OR REPLACE FUNCTION create_initial_admin(
  admin_email TEXT,
  admin_password TEXT,
  admin_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_password TEXT;
BEGIN
  -- Check if admin already exists
  IF has_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin already exists'
    );
  END IF;

  -- Validate inputs
  IF admin_email IS NULL OR admin_email = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email is required');
  END IF;
  
  IF admin_password IS NULL OR LENGTH(admin_password) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 8 characters');
  END IF;
  
  IF admin_name IS NULL OR admin_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Name is required');
  END IF;

  -- Generate user ID
  v_user_id := gen_random_uuid();
  
  -- Hash password
  v_encrypted_password := crypt(admin_password, gen_salt('bf'));

  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    admin_email,
    v_encrypted_password,
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('name', admin_name),
    false
  );

  -- Create admin record
  INSERT INTO admins (id, name, email, is_super_admin)
  VALUES (v_user_id, admin_name, admin_email, true);

  -- Mark system as initialized
  UPDATE platform_config
  SET value = 'true'
  WHERE key = 'system_initialized';

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', admin_email
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email already exists');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon (needed for initial setup)
GRANT EXECUTE ON FUNCTION has_admin() TO anon;
GRANT EXECUTE ON FUNCTION create_initial_admin(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION has_admin() TO authenticated;

