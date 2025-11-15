-- Platform Configuration Table
-- This table stores system-wide configuration settings

CREATE TABLE IF NOT EXISTS platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES admins(id)
);

-- Insert default configuration values
INSERT INTO platform_config (key, value, description) VALUES
  ('idle_timeout_minutes', '5', 'Number of minutes before an idle chat is reassigned (1-30)'),
  ('max_reassignments', '3', 'Maximum number of times a chat can be reassigned'),
  ('free_message_count', '3', 'Number of free messages per chat before credits are required'),
  ('credit_price_kes', '10', 'Price per credit in Kenyan Shillings'),
  ('maintenance_mode', 'false', 'Whether the platform is in maintenance mode')
ON CONFLICT (key) DO NOTHING;

-- RLS Policies for platform_config
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- Admins can view all configuration
CREATE POLICY "Admins can view configuration"
  ON platform_config FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

-- Admins can update configuration
CREATE POLICY "Admins can update configuration"
  ON platform_config FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

-- Create function to get configuration value
CREATE OR REPLACE FUNCTION get_config_value(config_key TEXT)
RETURNS JSONB AS $$
DECLARE
  config_value JSONB;
BEGIN
  SELECT value INTO config_value
  FROM platform_config
  WHERE key = config_key;
  
  RETURN config_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update configuration
CREATE OR REPLACE FUNCTION update_config_value(
  config_key TEXT,
  config_value JSONB,
  admin_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE platform_config
  SET value = config_value,
      updated_at = NOW(),
      updated_by = admin_id
  WHERE key = config_key;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for faster lookups
CREATE INDEX idx_platform_config_key ON platform_config(key);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_platform_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER platform_config_updated_at
  BEFORE UPDATE ON platform_config
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_config_timestamp();
