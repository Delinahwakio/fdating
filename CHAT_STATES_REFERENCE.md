# Chat States Quick Reference

## Chat State Values

| State | Description | When Set | Next State |
|-------|-------------|----------|------------|
| `waiting_assignment` | Chat needs an operator to respond | Real user sends message | `assigned` |
| `assigned` | Operator is actively working on the chat | Operator gets assigned | `waiting_real_user_reply` |
| `waiting_real_user_reply` | Operator replied, waiting for real user | Operator sends message | `waiting_assignment` |
| `completed` | Chat has ended | Max reassignments reached | N/A |

## State Transition Rules

### ✅ Valid Transitions

```
waiting_assignment → assigned
  Trigger: Operator requests and gets assignment
  Requirements: Operator is active and available

assigned → waiting_real_user_reply
  Trigger: Operator sends message
  Requirements: Operator must be assigned to chat

waiting_real_user_reply → waiting_assignment
  Trigger: Real user sends message
  Requirements: None

assigned → waiting_assignment
  Trigger: Manual unassignment or idle timeout
  Requirements: Admin action or idle detection

waiting_assignment → completed
  Trigger: Max reassignments reached
  Requirements: Reassignment count >= max_reassignments
```

### ❌ Invalid Transitions

- `waiting_real_user_reply` → `assigned` (Cannot reassign while waiting for user)
- `completed` → any state (Completed chats stay completed)
- Any state → `assigned` without operator_id (Must have operator)

## Key Fields

### `chat_state`
- **Type:** TEXT
- **Values:** `waiting_assignment`, `assigned`, `waiting_real_user_reply`, `completed`
- **Purpose:** Track current state of the chat

### `last_operator_id`
- **Type:** UUID (references operators.id)
- **Purpose:** Prevent same operator from getting the same chat repeatedly
- **Set when:** Operator is assigned to chat
- **Used in:** Assignment function to filter out recent operators

### `operator_replied_at`
- **Type:** TIMESTAMPTZ
- **Purpose:** Track when operator last replied
- **Set when:** Operator sends message
- **Used for:** Metrics, debugging, state validation

## Common Queries

### Get all chats waiting for assignment
```sql
SELECT * FROM chats
WHERE chat_state = 'waiting_assignment'
AND is_active = true
ORDER BY created_at ASC;
```

### Get all chats assigned to operators
```sql
SELECT 
  c.*,
  o.name as operator_name
FROM chats c
JOIN operators o ON c.assigned_operator_id = o.id
WHERE c.chat_state = 'assigned'
AND c.is_active = true;
```

### Get all chats waiting for real user reply
```sql
SELECT 
  c.*,
  o.name as last_operator_name,
  EXTRACT(EPOCH FROM (NOW() - c.operator_replied_at)) / 60 as minutes_waiting
FROM chats c
LEFT JOIN operators o ON c.last_operator_id = o.id
WHERE c.chat_state = 'waiting_real_user_reply'
AND c.is_active = true
ORDER BY c.operator_replied_at ASC;
```

### Check state distribution
```sql
SELECT * FROM chat_state_summary;
```

### Get assignment queue metrics
```sql
SELECT * FROM get_assignment_queue_status();
```

## Debugging

### Chat stuck in `assigned` state?
```sql
-- Check if operator is still active
SELECT 
  c.id,
  c.assigned_operator_id,
  o.name,
  o.is_active,
  o.is_available,
  c.assignment_time,
  EXTRACT(EPOCH FROM (NOW() - c.assignment_time)) / 60 as minutes_assigned
FROM chats c
JOIN operators o ON c.assigned_operator_id = o.id
WHERE c.chat_state = 'assigned'
AND c.id = 'your-chat-id';

-- Manually release if needed
SELECT release_and_reassign_chat('your-chat-id', 'manual_debug');
```

### Chat stuck in `waiting_real_user_reply`?
```sql
-- Check last message
SELECT 
  c.id,
  c.chat_state,
  c.operator_replied_at,
  m.sender_type as last_message_sender,
  m.created_at as last_message_time
FROM chats c
LEFT JOIN LATERAL (
  SELECT sender_type, created_at
  FROM messages
  WHERE chat_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) m ON true
WHERE c.id = 'your-chat-id';

-- If last message is from real user, fix the state
UPDATE chats
SET chat_state = 'waiting_assignment'
WHERE id = 'your-chat-id'
AND chat_state = 'waiting_real_user_reply';
```

### Operator keeps getting same chat?
```sql
-- Check last_operator_id
SELECT 
  id,
  chat_state,
  last_operator_id,
  assigned_operator_id
FROM chats
WHERE id = 'problematic-chat-id';

-- Check assignment history
SELECT 
  ca.assigned_at,
  ca.released_at,
  ca.release_reason,
  o.name as operator_name
FROM chat_assignments ca
JOIN operators o ON ca.operator_id = o.id
WHERE ca.chat_id = 'problematic-chat-id'
ORDER BY ca.assigned_at DESC;
```

## API Behavior

### POST `/api/operator/assign`
- Finds chat with `chat_state = 'waiting_assignment'`
- Excludes chats where `last_operator_id = current_operator_id`
- Sets `chat_state = 'assigned'`
- Sets `assigned_operator_id` and `assignment_time`
- Updates `last_operator_id`

### POST `/api/operator/messages`
- Requires `chat_state = 'assigned'`
- Sets `chat_state = 'waiting_real_user_reply'`
- Sets `operator_replied_at = NOW()`
- Clears `assigned_operator_id` (operator can get new chats)
- Removes operator activity record

### POST `/api/messages` (Real User)
- Sets `chat_state = 'waiting_assignment'`
- Clears `assigned_operator_id` if present
- Chat becomes assignable for operators

### POST `/api/operator/unassign`
- Sets `chat_state = 'waiting_assignment'`
- Clears `assigned_operator_id`
- Returns chat to queue

### GET `/api/cron/idle-detection`
- Only checks chats with `chat_state = 'assigned'`
- Ignores `waiting_real_user_reply` (operator already replied)
- Calls `release_and_reassign_chat()` for idle chats

## Monitoring Dashboard Queries

### Real-time Queue Status
```sql
SELECT 
  (SELECT COUNT(*) FROM chats WHERE chat_state = 'waiting_assignment' AND is_active = true) as waiting,
  (SELECT COUNT(*) FROM chats WHERE chat_state = 'assigned' AND is_active = true) as assigned,
  (SELECT COUNT(*) FROM chats WHERE chat_state = 'waiting_real_user_reply' AND is_active = true) as waiting_reply,
  (SELECT COUNT(*) FROM operators WHERE is_active = true AND is_available = true) as available_operators;
```

### Average Wait Times
```sql
SELECT 
  chat_state,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 60)::NUMERIC(10,2) as avg_minutes,
  MAX(EXTRACT(EPOCH FROM (NOW() - created_at)) / 60)::NUMERIC(10,2) as max_minutes
FROM chats
WHERE is_active = true
GROUP BY chat_state;
```

### Operator Performance
```sql
SELECT 
  o.name,
  COUNT(DISTINCT ca.chat_id) as chats_handled_today,
  COUNT(m.id) as messages_sent_today,
  AVG(EXTRACT(EPOCH FROM (m.created_at - prev_msg.created_at)))::NUMERIC(10,2) as avg_response_seconds
FROM operators o
LEFT JOIN chat_assignments ca ON o.id = ca.operator_id 
  AND ca.assigned_at > CURRENT_DATE
LEFT JOIN messages m ON o.id = m.handled_by_operator_id 
  AND m.created_at > CURRENT_DATE
LEFT JOIN LATERAL (
  SELECT created_at
  FROM messages
  WHERE chat_id = m.chat_id
  AND created_at < m.created_at
  AND sender_type = 'real'
  ORDER BY created_at DESC
  LIMIT 1
) prev_msg ON true
WHERE o.is_active = true
GROUP BY o.id, o.name
ORDER BY chats_handled_today DESC;
```

## Best Practices

1. **Always check `chat_state`** when querying chats, not just `assigned_operator_id`
2. **Use the provided functions** (`assign_chat_to_operator`, `release_and_reassign_chat`) instead of manual updates
3. **Monitor state distribution** regularly using `chat_state_summary`
4. **Check for stuck chats** daily using `detect_stuck_chats(24)`
5. **Review assignment history** for problematic chats to understand patterns

## Emergency Fixes

### Reset all stuck chats
```sql
-- Use with caution! This resets all chats to waiting_assignment
UPDATE chats
SET 
  chat_state = 'waiting_assignment',
  assigned_operator_id = NULL,
  assignment_time = NULL
WHERE is_active = true
AND chat_state IN ('assigned', 'waiting_real_user_reply')
AND updated_at < NOW() - INTERVAL '2 hours';
```

### Clear operator assignments
```sql
-- Release all chats for a specific operator
UPDATE chats
SET 
  chat_state = 'waiting_assignment',
  assigned_operator_id = NULL,
  assignment_time = NULL
WHERE assigned_operator_id = 'operator-uuid-here'
AND is_active = true;
```

