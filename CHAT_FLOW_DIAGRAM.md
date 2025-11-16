# Chat Assignment Flow - Visual Diagrams

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CHAT LIFECYCLE                              │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  Real User   │
│ Sends First  │
│   Message    │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STATE: waiting_assignment                                           │
│ - Chat is in the queue                                              │
│ - Visible to all available operators                                │
│ - assigned_operator_id = NULL                                       │
│ - last_operator_id = may be set (from previous conversation)       │
└──────┬──────────────────────────────────────────────────────────────┘
       │
       │ Operator clicks "Get Assignment"
       │ API: POST /api/operator/assign
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STATE: assigned                                                     │
│ - Operator is actively working on the chat                          │
│ - assigned_operator_id = operator's UUID                            │
│ - assignment_time = NOW()                                           │
│ - last_operator_id = operator's UUID                                │
│ - Heartbeat updates operator_activity table                         │
└──────┬──────────────────────────────────────────────────────────────┘
       │
       │ Operator sends reply
       │ API: POST /api/operator/messages
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STATE: waiting_real_user_reply                                      │
│ - Operator has replied, waiting for real user                       │
│ - assigned_operator_id = NULL (operator can get new chats)         │
│ - operator_replied_at = NOW()                                       │
│ - last_operator_id = operator's UUID (prevents reassignment)       │
│ - Chat is NOT in assignment queue                                   │
└──────┬──────────────────────────────────────────────────────────────┘
       │
       │ Real user sends reply
       │ API: POST /api/messages
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STATE: waiting_assignment                                           │
│ - Chat is back in the queue                                         │
│ - Can be assigned to ANY operator (preferably different one)       │
│ - Cycle repeats                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## State Transition Matrix

```
┌─────────────────────────┬──────────────────────────────────────────┐
│   Current State         │   Possible Next States                   │
├─────────────────────────┼──────────────────────────────────────────┤
│ waiting_assignment      │ → assigned (operator gets chat)          │
│                         │ → completed (max reassignments)          │
├─────────────────────────┼──────────────────────────────────────────┤
│ assigned                │ → waiting_real_user_reply (op replies)   │
│                         │ → waiting_assignment (unassign/idle)     │
├─────────────────────────┼──────────────────────────────────────────┤
│ waiting_real_user_reply │ → waiting_assignment (user replies)      │
├─────────────────────────┼──────────────────────────────────────────┤
│ completed               │ (terminal state)                         │
└─────────────────────────┴──────────────────────────────────────────┘
```

## Operator Perspective

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OPERATOR DASHBOARD                               │
└─────────────────────────────────────────────────────────────────────┘

Operator is available and clicks "Get Assignment"
                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│ System searches for:                                                │
│ - chat_state = 'waiting_assignment'                                 │
│ - is_active = true                                                  │
│ - last_operator_id != current_operator (if possible)                │
│ - ORDER BY created_at ASC (oldest first)                            │
└──────┬──────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Chat Found?                                                         │
├─────────────────────────────────────────────────────────────────────┤
│ YES → Assign chat to operator                                       │
│       - Update chat_state to 'assigned'                             │
│       - Set assigned_operator_id                                    │
│       - Set assignment_time                                         │
│       - Create operator_activity record                             │
│       - Show chat interface to operator                             │
├─────────────────────────────────────────────────────────────────────┤
│ NO  → Show "No chats waiting" message                               │
│       - Operator stays on waiting page                              │
│       - Can click "Get Assignment" again                            │
└─────────────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Operator reads chat history and types reply                         │
│ - Heartbeat updates every 30 seconds                                │
│ - Updates operator_activity.last_activity                           │
└──────┬──────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Operator sends message                                              │
│ - Message inserted into messages table                              │
│ - chat_state → 'waiting_real_user_reply'                            │
│ - operator_replied_at → NOW()                                       │
│ - assigned_operator_id → NULL                                       │
│ - Operator redirected to waiting page                               │
│ - Operator can now get a NEW chat                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Real User Perspective

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REAL USER CHAT                                   │
└─────────────────────────────────────────────────────────────────────┘

User browses fictional profiles and starts chat
                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│ User sends first message                                            │
│ - Message inserted into messages table                              │
│ - Chat created with chat_state = 'waiting_assignment'               │
│ - Chat enters operator queue                                        │
└──────┬──────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ User waits for reply...                                             │
│ - Real-time subscription active                                     │
│ - Sees "typing" indicator when operator is typing                   │
└──────┬──────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Operator reply arrives                                              │
│ - Message appears in chat                                           │
│ - User can reply                                                    │
└──────┬──────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ User sends reply                                                    │
│ - Message inserted into messages table                              │
│ - chat_state → 'waiting_assignment'                                 │
│ - Chat re-enters operator queue                                     │
│ - May be assigned to DIFFERENT operator                             │
└─────────────────────────────────────────────────────────────────────┘
```

## Idle Detection Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│              CRON JOB: Idle Detection (runs every minute)           │
└─────────────────────────────────────────────────────────────────────┘

Cron job starts
       ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Find chats where:                                                   │
│ - chat_state = 'assigned' (ONLY actively assigned chats)            │
│ - assigned_operator_id IS NOT NULL                                  │
│ - assignment_time < NOW() - idle_timeout_minutes                    │
│ - is_active = true                                                  │
└──────┬──────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ For each potentially idle chat:                                     │
│ 1. Check operator_activity.last_activity                            │
│ 2. If last_activity < idle_threshold:                               │
│    - Call release_and_reassign_chat()                               │
│    - Chat returns to 'waiting_assignment' state                     │
│    - Log the reassignment                                           │
└─────────────────────────────────────────────────────────────────────┘

NOTE: Chats in 'waiting_real_user_reply' state are IGNORED
      (Operator already replied, just waiting for user)
```

## Same-Operator Prevention

```
┌─────────────────────────────────────────────────────────────────────┐
│           HOW SAME-OPERATOR PREVENTION WORKS                        │
└─────────────────────────────────────────────────────────────────────┘

Scenario: Operator A just replied to Chat X

Chat X State:
┌─────────────────────────────────────────────────────────────────────┐
│ chat_state: 'waiting_real_user_reply'                               │
│ last_operator_id: Operator A's UUID                                 │
│ assigned_operator_id: NULL                                          │
└─────────────────────────────────────────────────────────────────────┘

Real user replies to Chat X
       ↓
Chat X State:
┌─────────────────────────────────────────────────────────────────────┐
│ chat_state: 'waiting_assignment'                                    │
│ last_operator_id: Operator A's UUID (STILL SET!)                    │
│ assigned_operator_id: NULL                                          │
└─────────────────────────────────────────────────────────────────────┘

Operator A clicks "Get Assignment"
       ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Assignment function searches for:                                   │
│ - chat_state = 'waiting_assignment'                                 │
│ - last_operator_id != Operator A (EXCLUDES Chat X)                  │
│                                                                     │
│ Result: Operator A gets a DIFFERENT chat (Chat Y)                   │
└─────────────────────────────────────────────────────────────────────┘

Operator B clicks "Get Assignment"
       ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Assignment function searches for:                                   │
│ - chat_state = 'waiting_assignment'                                 │
│ - last_operator_id != Operator B (Chat X qualifies!)                │
│                                                                     │
│ Result: Operator B gets Chat X                                      │
└─────────────────────────────────────────────────────────────────────┘

This ensures variety and prevents operators from getting stuck
with the same conversations repeatedly!
```

## Database Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                    KEY DATABASE TABLES                              │
└─────────────────────────────────────────────────────────────────────┘

chats
├── id (PK)
├── real_user_id (FK → real_users)
├── fictional_user_id (FK → fictional_users)
├── chat_state ← NEW! ('waiting_assignment', 'assigned', etc.)
├── assigned_operator_id (FK → operators) ← Can be NULL
├── last_operator_id (FK → operators) ← NEW! Tracks last handler
├── operator_replied_at ← NEW! Timestamp of last operator reply
├── assignment_time
└── is_active

messages
├── id (PK)
├── chat_id (FK → chats)
├── sender_type ('real' or 'fictional')
├── content
├── handled_by_operator_id (FK → operators)
└── created_at

chat_assignments (History)
├── id (PK)
├── chat_id (FK → chats)
├── operator_id (FK → operators)
├── assigned_at
├── released_at
└── release_reason

operator_activity (Heartbeat)
├── id (PK)
├── chat_id (FK → chats)
├── operator_id (FK → operators)
├── last_activity ← Updated by heartbeat
└── updated_at
```

## Error Scenarios

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING                                   │
└─────────────────────────────────────────────────────────────────────┘

Scenario 1: Operator tries to get assignment while already assigned
┌─────────────────────────────────────────────────────────────────────┐
│ Check: Does operator have chat with chat_state = 'assigned'?        │
│ YES → Return error: "Operator already has an active assignment"     │
│ NO  → Proceed with assignment                                       │
└─────────────────────────────────────────────────────────────────────┘

Scenario 2: Operator tries to send message to unassigned chat
┌─────────────────────────────────────────────────────────────────────┐
│ Check: Is chat.assigned_operator_id = current_operator?             │
│ NO  → Return error: "You are not assigned to this chat"             │
│ YES → Allow message                                                 │
└─────────────────────────────────────────────────────────────────────┘

Scenario 3: Chat stuck in 'assigned' state for too long
┌─────────────────────────────────────────────────────────────────────┐
│ Idle detection cron job:                                            │
│ - Finds chat with assignment_time > idle_timeout                    │
│ - Checks operator_activity.last_activity                            │
│ - If truly idle, calls release_and_reassign_chat()                  │
│ - Chat returns to 'waiting_assignment'                              │
└─────────────────────────────────────────────────────────────────────┘

Scenario 4: Real user sends message while operator is assigned
┌─────────────────────────────────────────────────────────────────────┐
│ - Message is inserted                                               │
│ - chat_state → 'waiting_assignment'                                 │
│ - assigned_operator_id → NULL                                       │
│ - Chat assignment is released                                       │
│ - Chat can be assigned to another operator                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Success Metrics Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│                  MONITORING DASHBOARD                               │
└─────────────────────────────────────────────────────────────────────┘

Current Queue Status:
┌──────────────────────────┬─────────┐
│ waiting_assignment       │   12    │
│ assigned                 │    5    │
│ waiting_real_user_reply  │   23    │
│ completed                │    0    │
└──────────────────────────┴─────────┘

Average Wait Times:
┌──────────────────────────┬─────────┐
│ Time to assignment       │  2.3 min│
│ Operator response time   │  1.8 min│
│ User response time       │ 15.2 min│
└──────────────────────────┴─────────┘

Operator Distribution (Last Hour):
┌──────────────────────────┬─────────┐
│ Operator A               │   8 chats│
│ Operator B               │   7 chats│
│ Operator C               │   6 chats│
│ Operator D               │   5 chats│
└──────────────────────────┴─────────┘

Health Checks:
┌──────────────────────────┬─────────┐
│ Stuck chats (>1 hour)    │    0    │ ✅
│ Invalid states           │    0    │ ✅
│ Same-operator repeats    │    0    │ ✅
└──────────────────────────┴─────────┘
```

---

These diagrams provide a visual understanding of the complete chat assignment system with proper state management!

