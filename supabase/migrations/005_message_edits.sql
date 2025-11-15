-- Create message_edits table to log admin message modifications
CREATE TABLE IF NOT EXISTS message_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  original_content TEXT NOT NULL,
  new_content TEXT NOT NULL,
  edited_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_message_edits_message ON message_edits(message_id);
CREATE INDEX idx_message_edits_admin ON message_edits(admin_id);

-- Add RLS policies
ALTER TABLE message_edits ENABLE ROW LEVEL SECURITY;

-- Admins can view all edit logs
CREATE POLICY "Admins can view all message edits"
  ON message_edits FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

-- Admins can insert edit logs
CREATE POLICY "Admins can insert message edits"
  ON message_edits FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
