# Design Document

## Overview

Fantooo is a Next.js 14 application using TypeScript, Tailwind CSS, and Supabase as the backend. The architecture follows a role-based access pattern with three distinct user types (real users, operators, admins), each with dedicated interfaces and workflows. The system implements real-time messaging via Supabase Realtime, automated operator assignment with idle detection, and credit-based monetization through Paystack integration.

### Key Design Principles

1. **Role-Based Architecture**: Separate routing, layouts, and components for each user type
2. **Real-time First**: WebSocket connections for messaging, assignments, and status updates
3. **Security by Default**: Row Level Security (RLS) policies enforce data access at the database level
4. **Optimistic UI**: Immediate feedback with background synchronization
5. **Glassmorphism Design**: Consistent dark theme with frosted glass effects throughout

### Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript 5
- **Styling**: Tailwind CSS 3 with custom glassmorphism utilities
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Payments**: Paystack Inline JS
- **Deployment**: Vercel (frontend), Supabase (backend)
- **State Management**: React Context + Supabase Realtime subscriptions

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Real User   │  │   Operator   │  │    Admin     │      │
│  │     App      │  │     App      │  │     App      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Next.js API   │
                    │     Routes      │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
│   Supabase     │  │   Supabase      │  │    Paystack    │
│     Auth       │  │   PostgreSQL    │  │      API       │
└────────────────┘  └────────┬────────┘  └────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Supabase      │
                    │    Realtime     │
                    └─────────────────┘
```

### Application Structure


```
fantooo/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                    # Landing page
│   │   ├── get-started/
│   │   │   └── page.tsx                # Onboarding flow
│   │   ├── admin-login/
│   │   │   └── page.tsx                # Admin authentication
│   │   └── op-login/
│   │       └── page.tsx                # Operator authentication
│   ├── (real-user)/
│   │   ├── layout.tsx                  # Real user layout with nav
│   │   ├── discover/
│   │   │   └── page.tsx                # Browse fictional profiles
│   │   ├── profile/[id]/
│   │   │   └── page.tsx                # Fictional profile detail
│   │   ├── chat/[chatId]/
│   │   │   └── page.tsx                # Real user chat interface
│   │   ├── favorites/
│   │   │   └── page.tsx                # Favorited profiles
│   │   ├── me/
│   │   │   └── page.tsx                # User profile management
│   │   └── credits/
│   │       └── page.tsx                # Credit purchase & history
│   ├── (operator)/
│   │   ├── layout.tsx                  # Operator layout
│   │   ├── operator/
│   │   │   ├── waiting/
│   │   │   │   └── page.tsx            # Assignment queue
│   │   │   ├── chat/[chatId]/
│   │   │   │   └── page.tsx            # Three-panel operator chat
│   │   │   ├── stats/
│   │   │   │   └── page.tsx            # Operator statistics
│   │   │   └── settings/
│   │   │       └── page.tsx            # Operator settings
│   ├── (admin)/
│   │   ├── layout.tsx                  # Admin layout
│   │   └── admin/
│   │       ├── dashboard/
│   │       │   └── page.tsx            # Admin overview
│   │       ├── fictional-profiles/
│   │       │   └── page.tsx            # Manage fictional users
│   │       ├── real-users/
│   │       │   └── page.tsx            # User moderation
│   │       ├── operators/
│   │       │   └── page.tsx            # Operator management
│   │       ├── chats/
│   │       │   └── page.tsx            # Chat monitoring
│   │       ├── stats/
│   │       │   └── page.tsx            # Platform analytics
│   │       └── settings/
│   │           └── page.tsx            # Platform configuration
│   └── api/
│       ├── auth/
│       │   └── callback/
│       │       └── route.ts            # Supabase auth callback
│       ├── webhooks/
│       │   └── paystack/
│       │       └── route.ts            # Payment verification
│       └── cron/
│           └── idle-detection/
│               └── route.ts            # Scheduled idle check
├── components/
│   ├── shared/
│   │   ├── GlassCard.tsx
│   │   ├── GlassButton.tsx
│   │   ├── GlassInput.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   └── LoadingSpinner.tsx
│   ├── real-user/
│   │   ├── ProfileCard.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── ProfileCarousel.tsx
│   │   └── PaymentModal.tsx
│   ├── operator/
│   │   ├── ThreePanelChat.tsx
│   │   ├── ProfileNotes.tsx
│   │   ├── QueueInterface.tsx
│   │   └── ActivityMonitor.tsx
│   └── admin/
│       ├── ChatMonitorGrid.tsx
│       ├── OperatorPerformance.tsx
│       ├── AnalyticsCharts.tsx
│       └── UserManagement.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # Browser client
│   │   ├── server.ts                   # Server client
│   │   └── middleware.ts               # Auth middleware
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── ChatContext.tsx
│   │   └── RealtimeContext.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useChat.ts
│   │   ├── useRealtime.ts
│   │   └── useIdleDetection.ts
│   └── utils/
│       ├── validation.ts
│       ├── formatting.ts
│       └── constants.ts
└── supabase/
    ├── migrations/
    │   ├── 001_initial_schema.sql
    │   ├── 002_rls_policies.sql
    │   ├── 003_functions.sql
    │   └── 004_indexes.sql
    └── functions/
        ├── assign-chat/
        ├── release-assignment/
        └── process-payment/
```

## Components and Interfaces

### Authentication System

**Design Decision**: Use Supabase Auth with custom email format validation

**Implementation**:
- Custom sign-up flow that generates `name@fantooo.com` emails
- Three separate authentication contexts for real users, operators, and admins
- Role stored in custom claims via database triggers
- Middleware redirects based on user role

**Key Components**:


```typescript
// lib/supabase/client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

export const createClient = () => createClientComponentClient<Database>()

// lib/contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null
  role: 'real_user' | 'operator' | 'admin' | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (data: SignUpData) => Promise<void>
  signOut: () => Promise<void>
}

// Custom hook for role-based access
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

### Real-time Messaging System

**Design Decision**: Use Supabase Realtime with optimistic updates

**Architecture**:
1. Client subscribes to `messages` table filtered by `chat_id`
2. New messages trigger real-time callbacks
3. Optimistic UI adds message immediately, syncs in background
4. Typing indicators via presence channels
5. Read receipts updated via database triggers

**Message Flow**:
```
User types message
    ↓
Optimistic UI update (instant)
    ↓
API call to /api/messages
    ↓
Credit check & deduction
    ↓
Insert into messages table
    ↓
Database trigger updates chat.last_message_at
    ↓
Realtime broadcast to subscribers
    ↓
Recipient receives message
    ↓
Read receipt trigger on view
```

**Key Components**:

```typescript
// components/real-user/ChatInterface.tsx
interface ChatInterfaceProps {
  chatId: string
  fictionalUserId: string
  currentUserId: string
}

export const ChatInterface: FC<ChatInterfaceProps> = ({ chatId, fictionalUserId, currentUserId }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
          // Remove from optimistic if exists
          setOptimisticMessages(prev => prev.filter(m => m.id !== payload.new.id))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chatId])

  const sendMessage = async (content: string) => {
    const tempId = `temp-${Date.now()}`
    const optimisticMsg = {
      id: tempId,
      chat_id: chatId,
      sender_type: 'real',
      content,
      created_at: new Date().toISOString()
    }
    
    setOptimisticMessages(prev => [...prev, optimisticMsg])

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ chatId, content, senderId: currentUserId })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message)
      }
    } catch (error) {
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId))
      toast.error(error.message)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={[...messages, ...optimisticMessages]} />
      <MessageInput onSend={sendMessage} />
    </div>
  )
}
```

### Operator Assignment System

**Design Decision**: Queue-based assignment with fair distribution

**Algorithm**:
1. Maintain a queue of unassigned chats ordered by `created_at` ASC
2. When operator becomes available, assign oldest waiting chat
3. Track assignment in `chats.assigned_operator_id` and `chats.assignment_time`
4. Prevent multiple simultaneous assignments per operator

**Database Function**:

```sql
-- supabase/migrations/003_functions.sql
CREATE OR REPLACE FUNCTION assign_chat_to_operator(p_operator_id UUID)
RETURNS UUID AS $$
DECLARE
  v_chat_id UUID;
BEGIN
  -- Check if operator already has an assignment
  IF EXISTS (
    SELECT 1 FROM chats 
    WHERE assigned_operator_id = p_operator_id 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Operator already has an active assignment';
  END IF;

  -- Get oldest unassigned chat
  SELECT id INTO v_chat_id
  FROM chats
  WHERE assigned_operator_id IS NULL
  AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_chat_id IS NULL THEN
    RETURN NULL; -- No chats waiting
  END IF;

  -- Assign chat
  UPDATE chats
  SET assigned_operator_id = p_operator_id,
      assignment_time = NOW(),
      updated_at = NOW()
  WHERE id = v_chat_id;

  RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql;
```

**API Route**:

```typescript
// app/api/operator/assign/route.ts
export async function POST(request: Request) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify operator role
  const { data: operator } = await supabase
    .from('operators')
    .select('id, is_available')
    .eq('id', user.id)
    .single()

  if (!operator?.is_available) {
    return NextResponse.json({ error: 'Operator not available' }, { status: 400 })
  }

  // Call assignment function
  const { data: chatId, error } = await supabase
    .rpc('assign_chat_to_operator', { p_operator_id: user.id })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!chatId) {
    return NextResponse.json({ message: 'No chats waiting' }, { status: 200 })
  }

  // Fetch full chat details
  const { data: chat } = await supabase
    .from('chats')
    .select(`
      *,
      real_user:real_users(*),
      fictional_user:fictional_users(*)
    `)
    .eq('id', chatId)
    .single()

  return NextResponse.json({ chat }, { status: 200 })
}
```

### Idle Detection System

**Design Decision**: Client-side activity tracking with server-side validation

**Architecture**:
1. Client tracks operator actions (typing, clicks, mouse movement)
2. Client sends heartbeat every 30 seconds with activity timestamp
3. Server-side cron job checks assignments every 60 seconds
4. Chats idle > 5 minutes are flagged for reassignment
5. Warning notification sent at 4-minute mark

**Client-Side Hook**:

```typescript
// lib/hooks/useIdleDetection.ts
export const useIdleDetection = (chatId: string, onWarning: () => void, onTimeout: () => void) => {
  const lastActivityRef = useRef(Date.now())
  const warningShownRef = useRef(false)
  const supabase = createClient()

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    warningShownRef.current = false
  }, [])

  useEffect(() => {
    // Track user interactions
    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove']
    events.forEach(event => {
      window.addEventListener(event, updateActivity)
    })

    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(async () => {
      await fetch('/api/operator/heartbeat', {
        method: 'POST',
        body: JSON.stringify({ chatId, lastActivity: lastActivityRef.current })
      })
    }, 30000)

    // Check for warnings locally
    const warningInterval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current
      const fourMinutes = 4 * 60 * 1000
      const fiveMinutes = 5 * 60 * 1000

      if (idleTime >= fiveMinutes) {
        onTimeout()
      } else if (idleTime >= fourMinutes && !warningShownRef.current) {
        warningShownRef.current = true
        onWarning()
      }
    }, 10000) // Check every 10 seconds

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity))
      clearInterval(heartbeatInterval)
      clearInterval(warningInterval)
    }
  }, [chatId, updateActivity, onWarning, onTimeout])

  return { updateActivity }
}
```

**Server-Side Cron Job**:

```typescript
// app/api/cron/idle-detection/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  // Find idle chats
  const { data: idleChats } = await supabase
    .from('chats')
    .select('id, assigned_operator_id, assignment_time')
    .not('assigned_operator_id', 'is', null)
    .lt('assignment_time', fiveMinutesAgo)
    .eq('is_active', true)

  for (const chat of idleChats || []) {
    // Check last activity from heartbeat
    const { data: activity } = await supabase
      .from('operator_activity')
      .select('last_activity')
      .eq('chat_id', chat.id)
      .single()

    if (!activity || new Date(activity.last_activity) < new Date(fiveMinutesAgo)) {
      // Reassign chat
      await supabase.rpc('release_and_reassign_chat', { 
        p_chat_id: chat.id,
        p_reason: 'idle_timeout'
      })
    }
  }

  return NextResponse.json({ success: true })
}
```



### Credit System & Payment Integration

**Design Decision**: Track free messages per chat, integrate Paystack for purchases

**Credit Deduction Logic**:

```typescript
// app/api/messages/route.ts
export async function POST(request: Request) {
  const supabase = createServerClient()
  const { chatId, content, senderId } = await request.json()

  // Get message count for this user in this chat
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('chat_id', chatId)
    .eq('sender_type', 'real')

  const messageCount = count || 0
  let isFreeMessage = messageCount < 3

  // If not free, check and deduct credits
  if (!isFreeMessage) {
    const { data: user } = await supabase
      .from('real_users')
      .select('credits')
      .eq('id', senderId)
      .single()

    if (!user || user.credits < 1) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please purchase more credits to continue chatting.' },
        { status: 402 }
      )
    }

    // Deduct credit
    const { error: deductError } = await supabase
      .from('real_users')
      .update({ credits: user.credits - 1 })
      .eq('id', senderId)

    if (deductError) {
      return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 })
    }
  }

  // Insert message
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_type: 'real',
      content,
      is_free_message: isFreeMessage
    })
    .select()
    .single()

  if (error) {
    // Refund credit if message failed
    if (!isFreeMessage) {
      await supabase
        .from('real_users')
        .update({ credits: user.credits })
        .eq('id', senderId)
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update chat last_message_at
  await supabase
    .from('chats')
    .update({ 
      last_message_at: new Date().toISOString(),
      message_count: messageCount + 1
    })
    .eq('id', chatId)

  return NextResponse.json({ message }, { status: 201 })
}
```

**Paystack Integration**:

```typescript
// components/real-user/PaymentModal.tsx
interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

const CREDIT_PACKAGES = [
  { credits: 10, price: 100, label: '10 Credits' },
  { credits: 25, price: 250, label: '25 Credits' },
  { credits: 50, price: 500, label: '50 Credits' },
  { credits: 100, price: 1000, label: '100 Credits' }
]

export const PaymentModal: FC<PaymentModalProps> = ({ isOpen, onClose, userId }) => {
  const [selectedPackage, setSelectedPackage] = useState(CREDIT_PACKAGES[0])
  const { user } = useAuth()

  const handlePayment = () => {
    const handler = (window as any).PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: user.email,
      amount: selectedPackage.price * 100, // Convert to kobo
      currency: 'KES',
      ref: `${Date.now()}-${userId}`,
      metadata: {
        user_id: userId,
        credits: selectedPackage.credits
      },
      callback: async (response: any) => {
        // Verify payment on backend
        const result = await fetch('/api/webhooks/paystack/verify', {
          method: 'POST',
          body: JSON.stringify({ reference: response.reference })
        })

        if (result.ok) {
          toast.success(`${selectedPackage.credits} credits added successfully!`)
          onClose()
        } else {
          toast.error('Payment verification failed')
        }
      },
      onClose: () => {
        toast.info('Payment cancelled')
      }
    })

    handler.openIframe()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-gray-50 mb-4">Purchase Credits</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {CREDIT_PACKAGES.map(pkg => (
            <button
              key={pkg.credits}
              onClick={() => setSelectedPackage(pkg)}
              className={`glass-button p-4 rounded-lg ${
                selectedPackage.credits === pkg.credits ? 'border-red-600' : ''
              }`}
            >
              <div className="text-lg font-bold">{pkg.label}</div>
              <div className="text-gray-300">KES {pkg.price}</div>
            </button>
          ))}
        </div>
        <GlassButton onClick={handlePayment} className="w-full">
          Pay KES {selectedPackage.price}
        </GlassButton>
      </div>
    </Modal>
  )
}
```

**Webhook Handler**:

```typescript
// app/api/webhooks/paystack/route.ts
import crypto from 'crypto'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('x-paystack-signature')

  // Verify webhook signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex')

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)

  if (event.event === 'charge.success') {
    const { reference, metadata, amount } = event.data
    const { user_id, credits } = metadata

    const supabase = createServerClient()

    // Create transaction record
    await supabase.from('transactions').insert({
      real_user_id: user_id,
      amount: amount / 100, // Convert from kobo
      credits_purchased: credits,
      paystack_reference: reference,
      status: 'success',
      completed_at: new Date().toISOString()
    })

    // Add credits to user
    const { data: user } = await supabase
      .from('real_users')
      .select('credits')
      .eq('id', user_id)
      .single()

    await supabase
      .from('real_users')
      .update({ credits: (user?.credits || 0) + credits })
      .eq('id', user_id)
  }

  return NextResponse.json({ received: true })
}
```

## Data Models

### Database Schema

**Core Tables**:

```sql
-- Real Users
CREATE TABLE real_users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  gender TEXT CHECK (gender IN ('male', 'female')) NOT NULL,
  looking_for TEXT CHECK (looking_for IN ('male', 'female')) NOT NULL,
  age INTEGER CHECK (age >= 18 AND age <= 100) NOT NULL,
  profile_picture TEXT,
  credits INTEGER DEFAULT 0 CHECK (credits >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fictional Users
CREATE TABLE fictional_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER CHECK (age >= 18 AND age <= 100) NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')) NOT NULL,
  location TEXT NOT NULL,
  bio TEXT,
  profile_pictures TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES admins(id)
);

-- Chats
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  real_user_id UUID REFERENCES real_users(id) ON DELETE CASCADE NOT NULL,
  fictional_user_id UUID REFERENCES fictional_users(id) ON DELETE CASCADE NOT NULL,
  real_profile_notes TEXT DEFAULT '',
  fictional_profile_notes TEXT DEFAULT '',
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
  assignment_time TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(real_user_id, fictional_user_id)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT CHECK (sender_type IN ('real', 'fictional')) NOT NULL,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 5000),
  handled_by_operator_id UUID REFERENCES operators(id),
  is_free_message BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

-- Operators
CREATE TABLE operators (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT false,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  total_messages INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES admins(id)
);

-- Admins
CREATE TABLE admins (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_super_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorites
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  real_user_id UUID REFERENCES real_users(id) ON DELETE CASCADE NOT NULL,
  fictional_user_id UUID REFERENCES fictional_users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(real_user_id, fictional_user_id)
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  real_user_id UUID REFERENCES real_users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  credits_purchased INTEGER NOT NULL CHECK (credits_purchased > 0),
  paystack_reference TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Operator Stats
CREATE TABLE operator_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES operators(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  chats_handled INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(operator_id, date)
);

-- Operator Activity (for idle detection)
CREATE TABLE operator_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  operator_id UUID REFERENCES operators(id) ON DELETE CASCADE NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_id, operator_id)
);

-- Chat Assignments History
CREATE TABLE chat_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  operator_id UUID REFERENCES operators(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  release_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes for Performance**:

```sql
-- Frequently queried fields
CREATE INDEX idx_chats_real_user ON chats(real_user_id);
CREATE INDEX idx_chats_fictional_user ON chats(fictional_user_id);
CREATE INDEX idx_chats_operator ON chats(assigned_operator_id);
CREATE INDEX idx_chats_active ON chats(is_active) WHERE is_active = true;
CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_favorites_user ON favorites(real_user_id);
CREATE INDEX idx_transactions_user ON transactions(real_user_id);
CREATE INDEX idx_operator_stats_date ON operator_stats(operator_id, date DESC);

-- Composite indexes for common queries
CREATE INDEX idx_chats_assignment_queue ON chats(created_at ASC) 
  WHERE assigned_operator_id IS NULL AND is_active = true;
CREATE INDEX idx_fictional_active_gender ON fictional_users(gender, is_active) 
  WHERE is_active = true;
```



### TypeScript Types

```typescript
// types/database.ts
export interface RealUser {
  id: string
  name: string
  display_name: string
  email: string
  location: string
  latitude: number | null
  longitude: number | null
  gender: 'male' | 'female'
  looking_for: 'male' | 'female'
  age: number
  profile_picture: string | null
  credits: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FictionalUser {
  id: string
  name: string
  age: number
  gender: 'male' | 'female'
  location: string
  bio: string | null
  profile_pictures: string[]
  is_active: boolean
  created_at: string
  created_by: string | null
}

export interface Chat {
  id: string
  real_user_id: string
  fictional_user_id: string
  real_profile_notes: string
  fictional_profile_notes: string
  message_count: number
  last_message_at: string
  assigned_operator_id: string | null
  assignment_time: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  chat_id: string
  sender_type: 'real' | 'fictional'
  content: string
  handled_by_operator_id: string | null
  is_free_message: boolean
  created_at: string
  delivered_at: string | null
  read_at: string | null
}

export interface Operator {
  id: string
  name: string
  email: string
  is_active: boolean
  is_available: boolean
  last_activity: string
  total_messages: number
  created_at: string
  created_by: string | null
}

export interface Transaction {
  id: string
  real_user_id: string
  amount: number
  credits_purchased: number
  paystack_reference: string
  status: 'pending' | 'success' | 'failed'
  created_at: string
  completed_at: string | null
}
```

## Error Handling

### Error Handling Strategy

**Principles**:
1. Never expose sensitive system information to clients
2. Log all errors with context for debugging
3. Provide user-friendly error messages
4. Implement retry logic for transient failures
5. Use error boundaries for React component errors

**API Error Response Format**:

```typescript
// lib/utils/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const errorHandler = (error: unknown): NextResponse => {
  console.error('API Error:', error)

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }

  // Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as { code: string; message: string }
    
    // Handle specific PostgreSQL errors
    if (pgError.code === '23505') {
      return NextResponse.json(
        { error: 'This resource already exists', code: 'DUPLICATE' },
        { status: 409 }
      )
    }
    
    if (pgError.code === '23503') {
      return NextResponse.json(
        { error: 'Referenced resource not found', code: 'FOREIGN_KEY' },
        { status: 404 }
      )
    }
  }

  // Generic error
  return NextResponse.json(
    { error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' },
    { status: 500 }
  )
}
```

**React Error Boundary**:

```typescript
// components/shared/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error:', error, errorInfo)
    // Send to error monitoring service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#0F0F23]">
          <GlassCard className="p-8 max-w-md">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h2>
            <p className="text-gray-300 mb-4">
              We're sorry, but something unexpected happened. Please refresh the page to try again.
            </p>
            <GlassButton onClick={() => window.location.reload()}>
              Refresh Page
            </GlassButton>
          </GlassCard>
        </div>
      )
    }

    return this.props.children
  }
}
```

**Client-Side Error Handling**:

```typescript
// lib/utils/api.ts
export const apiClient = {
  async request<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new AppError(
          error.error || 'Request failed',
          response.status,
          error.code || 'UNKNOWN'
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      
      // Network error
      throw new AppError(
        'Network error. Please check your connection.',
        0,
        'NETWORK_ERROR'
      )
    }
  }
}
```

## Testing Strategy

### Testing Approach

**Unit Tests**:
- Utility functions (validation, formatting)
- Custom hooks (useAuth, useChat, useIdleDetection)
- Database functions (SQL logic)

**Integration Tests**:
- API routes with mocked Supabase
- Authentication flows
- Payment webhook handling

**E2E Tests** (Optional for MVP):
- Complete user registration flow
- Chat message sending
- Credit purchase flow
- Operator assignment

**Testing Tools**:
- Jest for unit tests
- React Testing Library for component tests
- Playwright for E2E tests (future)

**Example Unit Test**:

```typescript
// lib/utils/__tests__/validation.test.ts
import { validateEmail, validateName, validateAge } from '../validation'

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should accept valid fantooo.com emails', () => {
      expect(validateEmail('john@fantooo.com')).toBe(true)
    })

    it('should reject non-fantooo.com emails', () => {
      expect(validateEmail('john@gmail.com')).toBe(false)
    })

    it('should reject invalid email formats', () => {
      expect(validateEmail('notanemail')).toBe(false)
    })
  })

  describe('validateName', () => {
    it('should accept valid names', () => {
      expect(validateName('john')).toBe(true)
      expect(validateName('john_doe')).toBe(true)
    })

    it('should reject names with spaces', () => {
      expect(validateName('john doe')).toBe(false)
    })

    it('should reject names shorter than 3 characters', () => {
      expect(validateName('jo')).toBe(false)
    })
  })

  describe('validateAge', () => {
    it('should accept ages between 18 and 100', () => {
      expect(validateAge(25)).toBe(true)
      expect(validateAge(18)).toBe(true)
      expect(validateAge(100)).toBe(true)
    })

    it('should reject ages outside valid range', () => {
      expect(validateAge(17)).toBe(false)
      expect(validateAge(101)).toBe(false)
    })
  })
})
```

**Example API Route Test**:

```typescript
// app/api/messages/__tests__/route.test.ts
import { POST } from '../route'
import { createMockSupabaseClient } from '@/lib/test-utils'

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn()
}))

describe('POST /api/messages', () => {
  it('should send free message for first 3 messages', async () => {
    const mockSupabase = createMockSupabaseClient({
      messageCount: 2,
      userCredits: 10
    })

    const request = new Request('http://localhost/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        chatId: 'chat-123',
        content: 'Hello',
        senderId: 'user-123'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.message.is_free_message).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('real_users')
    expect(mockSupabase.update).not.toHaveBeenCalled() // No credit deduction
  })

  it('should deduct credit for 4th message', async () => {
    const mockSupabase = createMockSupabaseClient({
      messageCount: 3,
      userCredits: 10
    })

    const request = new Request('http://localhost/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        chatId: 'chat-123',
        content: 'Hello',
        senderId: 'user-123'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.message.is_free_message).toBe(false)
    expect(mockSupabase.update).toHaveBeenCalledWith({ credits: 9 })
  })

  it('should reject message when user has insufficient credits', async () => {
    const mockSupabase = createMockSupabaseClient({
      messageCount: 3,
      userCredits: 0
    })

    const request = new Request('http://localhost/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        chatId: 'chat-123',
        content: 'Hello',
        senderId: 'user-123'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(402)
    expect(data.error).toContain('Insufficient credits')
  })
})
```

## Security Considerations

### Row Level Security (RLS) Policies

**Real Users Table**:

```sql
-- Real users can only read/update their own data
CREATE POLICY "Users can view own profile"
  ON real_users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON real_users FOR UPDATE
  USING (auth.uid() = id);

-- Operators and admins can view real user profiles for assigned chats
CREATE POLICY "Operators can view assigned chat users"
  ON real_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.real_user_id = real_users.id
      AND chats.assigned_operator_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all users"
  ON real_users FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );
```

**Messages Table**:

```sql
-- Users can view messages in their chats
CREATE POLICY "Users can view own chat messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.real_user_id = auth.uid()
    )
  );

-- Operators can view messages in assigned chats
CREATE POLICY "Operators can view assigned chat messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.assigned_operator_id = auth.uid()
    )
  );

-- Operators can insert messages as fictional users
CREATE POLICY "Operators can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_type = 'fictional'
    AND EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.assigned_operator_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins can manage all messages"
  ON messages FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
```

**Chats Table**:

```sql
-- Users can view their own chats
CREATE POLICY "Users can view own chats"
  ON chats FOR SELECT
  USING (real_user_id = auth.uid());

-- Operators can view assigned chats
CREATE POLICY "Operators can view assigned chats"
  ON chats FOR SELECT
  USING (assigned_operator_id = auth.uid());

-- Operators can update notes in assigned chats
CREATE POLICY "Operators can update assigned chat notes"
  ON chats FOR UPDATE
  USING (assigned_operator_id = auth.uid())
  WITH CHECK (assigned_operator_id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins can manage all chats"
  ON chats FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
```

### Input Validation & Sanitization

```typescript
// lib/utils/validation.ts
import DOMPurify from 'isomorphic-dompurify'

export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })
}

export const validateMessageContent = (content: string): boolean => {
  const sanitized = sanitizeInput(content)
  return sanitized.length > 0 && sanitized.length <= 5000
}

export const validateName = (name: string): boolean => {
  const nameRegex = /^[a-z0-9_]{3,20}$/
  return nameRegex.test(name)
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-z0-9_]+@fantooo\.com$/
  return emailRegex.test(email)
}

export const validateAge = (age: number): boolean => {
  return age >= 18 && age <= 100
}
```

### Rate Limiting

```typescript
// lib/middleware/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
})

// Different limits for different endpoints
export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 minutes
  analytics: true
})

export const messageRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 messages per minute
  analytics: true
})

export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true
})

// Usage in API route
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const { success, remaining } = await authRateLimit.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  // Continue with request handling
}
```

## Performance Optimizations

### Frontend Optimizations

**Code Splitting**:
```typescript
// app/(real-user)/chat/[chatId]/page.tsx
import dynamic from 'next/dynamic'

const ChatInterface = dynamic(() => import('@/components/real-user/ChatInterface'), {
  loading: () => <LoadingSpinner />,
  ssr: false // Chat requires client-side WebSocket
})

export default function ChatPage({ params }: { params: { chatId: string } }) {
  return <ChatInterface chatId={params.chatId} />
}
```

**Image Optimization**:
```typescript
// components/real-user/ProfileCard.tsx
import Image from 'next/image'

export const ProfileCard: FC<{ profile: FictionalUser }> = ({ profile }) => {
  return (
    <GlassCard>
      <Image
        src={profile.profile_pictures[0]}
        alt={profile.name}
        width={300}
        height={400}
        className="rounded-t-lg"
        loading="lazy"
        placeholder="blur"
        blurDataURL="/placeholder.jpg"
      />
      {/* Profile details */}
    </GlassCard>
  )
}
```

**Virtual Scrolling for Long Lists**:
```typescript
// components/real-user/MessageList.tsx
import { useVirtualizer } from '@tanstack/react-virtual'

export const MessageList: FC<{ messages: Message[] }> = ({ messages }) => {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5
  })

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            <ChatBubble message={messages[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Backend Optimizations

**Database Connection Pooling**:
```typescript
// lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js'

export const createServerClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: {
        schema: 'public'
      },
      auth: {
        persistSession: false
      },
      global: {
        headers: {
          'x-connection-pool': 'true'
        }
      }
    }
  )
}
```

**Caching Strategy**:
```typescript
// lib/cache.ts
import { unstable_cache } from 'next/cache'

export const getCachedFictionalProfiles = unstable_cache(
  async (gender: string) => {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('fictional_users')
      .select('*')
      .eq('gender', gender)
      .eq('is_active', true)
    
    return data
  },
  ['fictional-profiles'],
  {
    revalidate: 300, // 5 minutes
    tags: ['fictional-profiles']
  }
)
```

## Deployment Architecture

### Environment Configuration

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxx
PAYSTACK_SECRET_KEY=sk_test_xxx

NEXT_PUBLIC_APP_URL=https://fantooo.com

UPSTASH_REDIS_URL=https://your-redis.upstash.io
UPSTASH_REDIS_TOKEN=your-token

CRON_SECRET=your-cron-secret
```

### Vercel Deployment

**vercel.json**:
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/cron/idle-detection",
      "schedule": "* * * * *"
    }
  ]
}
```

### Supabase Edge Functions

Deploy idle detection and assignment logic as edge functions for better performance:

```bash
# Deploy edge functions
supabase functions deploy assign-chat
supabase functions deploy release-assignment
supabase functions deploy process-payment
```

This design provides a comprehensive blueprint for building Fantooo as a production-ready application with security, performance, and scalability in mind.
