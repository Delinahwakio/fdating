CREATE POLICY "Operators can view unassigned chats"
  ON chats FOR SELECT
  USING (is_operator() AND assigned_operator_id IS NULL);