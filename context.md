# Fantooo - Complete Project Context

## Project Overview
Fantooo is a fantasy chat platform where real users chat with fictional profiles managed by operators. The platform uses a unique email system (name@fantooo.com) and focuses on quick onboarding and seamless chat experiences.

## Core Concept
- **Real Users**: Register and chat with fictional profiles
- **Fictional Profiles**: Created by admin, managed by operators
- **Operators**: Handle multiple fictional profiles in real-time chats
- **Fair Distribution**: Smart assignment system for operators
- **Credit System**: First 3 messages free, then paid via Paystack

---

## Detailed Chat System Architecture

### Chat Idle Detection & Management

#### Idle Detection Logic
- **Activity Tracking**: Every operator action (typing, sending message, clicking) updates `last_operator_activity` timestamp
- **Idle Threshold**: Configurable timeout (default 5 minutes) before marking chat as idle
- **Real-time Monitoring**: WebSocket connections monitor operator presence and activity
- **Auto-reconnection**: Handle network disconnections gracefully

#### Chat Assignment Flow
1. **Initial Assignment**:
   - New chat enters queue
   - System finds longest-waiting available operator
   - Chat assigned with `assignment_time` timestamp
   - Operator receives real-time notification

2. **Activity Monitoring**:
   - Track operator keystrokes, mouse movement, tab focus
   - Update `last_operator_activity` every 30 seconds
   - Monitor WebSocket connection status

3. **Idle Detection**:
   - Background job checks chat assignments every minute
   - Mark chats idle if no activity within timeout
   - Send warning notifications before reassignment

4. **Reassignment Process**:
   - Release current assignment
   - Log reason in `chat_assignments` table
   - Return chat to queue with priority
   - Find next available operator
   - Limit reassignments to prevent infinite loops

#### Admin Chat Interface Features

**Three-Panel Layout**:
- **Left Panel - Real User Profile**:
  ```
  ┌─────────────────────┐
  │ [Profile Picture]   │
  │ Name: John Doe      │
  │ Age: 25             │
  │ Location: Nairobi   │
  │ Gender: Male        │
  │ Looking for: Female │
  │                     │
  │ Real Profile Notes: │
  │ ┌─────────────────┐ │
  │ │ [Editable Area] │ │
  │ │                 │ │
  │ └─────────────────┘ │
  │ [Save Notes] [Clear]│
  └─────────────────────┘
  ```

- **Center Panel - Chat History**:
  ```
  ┌─────────────────────────────┐
  │ Chat Timeline               │
  │ ┌─────────────────────────┐ │
  │ │ User: Hello there       │ │
  │ │ [FREE] [12:30 PM]      │ │
  │ └─────────────────────────┘ │
  │ ┌─────────────────────────┐ │
  │ │ Fictional: Hi! How are  │ │
  │ │ you? [Op: Sarah]        │ │
  │ │ [12:32 PM] [EDIT] [DEL] │ │
  │ └─────────────────────────┘ │
  │                             │
  │ Assignment Info:            │
  │ Current: Sarah (3 min ago)  │
  │ Previous: Mike (timeout)    │
  │                             │
  │ [Message Input]             │
  │ [Send as Admin]             │
  └─────────────────────────────┘
  ```

- **Right Panel - Fictional Profile**:
  ```
  ┌─────────────────────┐
  │ [Profile Pictures]  │
  │ Name: Emma Stone    │
  │ Age: 23             │
  │ Location: Kisumu    │
  │ Gender: Female      │
  │                     │
  │ Fictional Notes:    │
  │ ┌─────────────────┐ │
  │ │ Personality:    │ │
  │ │ Flirty, fun     │ │
  │ │ Interests: Art  │ │
  │ └─────────────────┘ │
  │                     │
  │ Admin Controls:     │
  │ [Reassign Chat]     │
  │ [Force Close]       │
  │ [Block User]        │
  └─────────────────────┘
  ```

### Chat Inspection Dashboard

#### Real-time Monitoring Features
- **Live Chat Grid**: 
  - Shows all active chats in real-time
  - Color-coded status (active, idle, timeout warning)
  - Operator response times
  - Message frequency indicators

- **Idle Alerts System**:
  - Visual alerts for chats approaching timeout
  - Sound notifications for critical timeouts
  - Automatic reassignment confirmations

- **Operator Performance Tracking**:
  - Response time averages
  - Messages per hour
  - Idle incidents count
  - Reassignment frequency

#### Queue Management Interface
```
┌─────────────────────────────────────────┐
│ LIVE CHAT MONITOR                       │
├─────────────────────────────────────────┤
│ Queue: 12 chats waiting                 │
│ Active: 8 operators online              │
│                                         │
│ ┌─────┬─────────┬──────────┬──────────┐ │
│ │Chat │Operator │Status    │Timer     │ │
│ ├─────┼─────────┼──────────┼──────────┤ │
│ │#001 │Sarah    │🟢 Active │2m 15s   │ │
│ │#002 │Mike     │🟡 Warning│4m 45s   │ │
│ │#003 │Lisa     │🔴 Idle   │6m 12s   │ │
│ │#004 │Queue    │⏳ Waiting│-        │ │
│ └─────┴─────────┴──────────┴──────────┘ │
│                                         │
│ Auto Actions:                           │
│ ☑ Reassign after 5min idle             │
│ ☑ Alert at 4min mark                   │
│ ☑ Max 3 reassignments per chat         │
│                                         │
│ [Force Reassign] [Bulk Actions]         │
└─────────────────────────────────────────┘
```

### Message Flow & Credit System

#### Free Message Tracking
- Track free message count per real_user + fictional_user combination
- First 3 messages are completely free
- 4th message onwards deduct credits
- Clear visual indicators in chat interface

#### Credit Deduction Logic
```javascript
// Pseudo-code for message sending
async function sendMessage(chatId, content, senderId) {
  const chat = await getChat(chatId);
  const messageCount = await getMessageCount(chatId, senderId);
  
  if (messageCount >= 3) {
    const user = await getRealUser(chat.real_user_id);
    if (user.credits < 1) {
      throw new Error('Insufficient credits');
    }
    await deductCredits(user.id, 1);
  }
  
  await saveMessage(chatId, content, senderId);
  await updateChatActivity(chatId);
}
```

### Admin Advanced Features

#### Message Editing Capabilities
- **Inline Editing**: Click any message to edit content
- **Edit History**: Track all message modifications
- **Operator Identification**: Show which operator sent each message
- **Bulk Operations**: Edit multiple messages, delete conversations

#### Chat Analytics & Insights
- **Conversation Quality Metrics**: Message length, response time, engagement
- **User Satisfaction Indicators**: Chat duration, return rates
- **Operator Performance Analytics**: Success rates, user ratings
- **Revenue Tracking**: Credits spent per chat, conversion rates

---

## Color Palette & Design System

### Primary Colors
- **Primary Red**: `#DC2626` (red-600)
- **Dark Red**: `#991B1B` (red-800) 
- **Light Red**: `#FCA5A5` (red-300)
- **Accent Red**: `#EF4444` (red-500)

### Dark Theme Colors
- **Background Primary**: `#0F0F23` (very dark navy)
- **Background Secondary**: `#1A1A2E` (dark purple-navy)
- **Surface**: `#16213E` (dark blue-gray)
- **Card Background**: `#1F2937` with glassmorphism
- **Text Primary**: `#F9FAFB` (gray-50)
- **Text Secondary**: `#D1D5DB` (gray-300)
- **Text Muted**: `#9CA3AF` (gray-400)

### Glassmorphism Effects
```css
.glass-card {
  background: rgba(31, 41, 55, 0.8);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.glass-button {
  background: rgba(220, 38, 38, 0.2);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(220, 38, 38, 0.3);
  transition: all 0.3s ease;
}

.glass-input {
  background: rgba(31, 41, 55, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}
```

---

## Supabase Database Structure

### 1. Authentication (auth.users)
Built-in Supabase auth with custom email format

### 2. **real_users** Table
```sql
CREATE TABLE real_users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL, -- name@fantooo.com format
  location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  gender TEXT CHECK (gender IN ('male', 'female')) NOT NULL,
  looking_for TEXT CHECK (looking_for IN ('male', 'female')) NOT NULL,
  age INTEGER NOT NULL,
  profile_picture TEXT,
  credits INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

### 3. **fictional_users** Table
```sql
CREATE TABLE fictional_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')) NOT NULL,
  location TEXT NOT NULL,
  bio TEXT,
  profile_pictures TEXT[], -- Array of image URLs
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES admins(id)
);
```

### 4. **chats** Table
```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  real_user_id UUID REFERENCES real_users(id) NOT NULL,
  fictional_user_id UUID REFERENCES fictional_users(id) NOT NULL,
  real_profile_notes TEXT DEFAULT '',
  fictional_profile_notes TEXT DEFAULT '',
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP DEFAULT NOW(),
  assigned_operator_id UUID REFERENCES operators(id),
  assignment_time TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(real_user_id, fictional_user_id)
);
```

### 5. **messages** Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) NOT NULL,
  sender_type TEXT CHECK (sender_type IN ('real', 'fictional')) NOT NULL,
  content TEXT NOT NULL,
  handled_by_operator_id UUID REFERENCES operators(id),
  is_free_message BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  read_at TIMESTAMP
);
```

### 6. **favorites** Table
```sql
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  real_user_id UUID REFERENCES real_users(id) NOT NULL,
  fictional_user_id UUID REFERENCES fictional_users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(real_user_id, fictional_user_id)
);
```

### 7. **operators** Table
```sql
CREATE TABLE operators (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT false,
  last_activity TIMESTAMP DEFAULT NOW(),
  total_messages INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES admins(id)
);
```

### 8. **admins** Table
```sql
CREATE TABLE admins (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_super_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 9. **operator_stats** Table
```sql
CREATE TABLE operator_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES operators(id) NOT NULL,
  date DATE NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  chats_handled INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(operator_id, date)
);
```

### 10. **transactions** Table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  real_user_id UUID REFERENCES real_users(id) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  credits_purchased INTEGER NOT NULL,
  paystack_reference TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

---

## Supabase Functions Structure

### 1. Edge Functions
- `assign-chat-to-operator`: Fair distribution logic
- `release-chat-assignment`: Handle disconnections/timeouts
- `process-payment`: Paystack webhook handling
- `generate-fictional-profiles`: Batch profile creation
- `cleanup-inactive-sessions`: Maintenance function

### 2. Database Functions
- `get_available_fictional_profiles(user_id, gender_preference)`
- `create_or_get_chat(real_user_id, fictional_user_id)`
- `update_operator_stats(operator_id, date)`
- `check_message_credits(real_user_id, chat_id)`

### 3. RLS Policies
- Real users can only access their own data
- Operators can only access assigned chats
- Admins have full access to all data
- Public read access for fictional profiles (limited fields)

---

## Application Pages & Routes

### Public Routes
1. **Landing Page** (`/`)
   - Hero section with value proposition
   - How it works section
   - Call-to-action buttons
   - Glassmorphism design elements

2. **Onboarding** (`/get-started`)
   - Step 1: Name (uniqueness check)
   - Step 2: Location (with autocomplete), Gender, Age, Looking for
   - Step 3: Password creation
   - Auto-generate email format

### Authenticated User Routes
3. **Discover** (`/discover`)
   - Grid of fictional profile cards
   - Filter and search functionality
   - Infinite scroll pagination

4. **Profile View** (`/profile/[id]`)
   - Full fictional profile display
   - Multiple photos carousel
   - Favorite/Chat action buttons

5. **Chat** (`/chat/[chatId]`)
   - Real-time messaging interface
   - Credit status indicator
   - Message history

6. **Favorites** (`/favorites`)
   - Grid of favorited profiles
   - Quick access to chat

7. **User Profile** (`/me`)
   - Edit personal information
   - Upload profile picture
   - View chat history

8. **Credits** (`/credits`)
   - Purchase credits interface
   - Transaction history
   - Paystack integration

### Operator Routes
9. **Operator Login** (`/op-login`)
   - Authentication for operators

10. **Waiting Room** (`/operator/waiting`)
    - Assignment queue interface
    - Availability toggle
    - Stats overview

11. **Operator Chat** (`/operator/chat/[chatId]`)
    - Three-panel layout
    - Real user profile (left)
    - Chat interface (center)
    - Fictional user profile (right)
    - Notes sections with save functionality

12. **Operator Stats** (`/operator/stats`)
    - Personal performance metrics
    - Message count by date

13. **Operator Settings** (`/operator/settings`)
    - Password change functionality

### Admin Routes
14. **Admin Login** (`/admin-login`)
    - Setup or login interface

15. **Admin Dashboard** (`/admin/dashboard`)
    - Overview statistics
    - Quick access to all sections

16. **Manage Fictional Profiles** (`/admin/fictional-profiles`)
    - CRUD operations for fictional users
    - Bulk import functionality

17. **Manage Real Users** (`/admin/real-users`)
    - User management and moderation
    - Block/suspend functionality

18. **Manage Operators** (`/admin/operators`)
    - Operator account creation
    - Performance monitoring
    - Account management

19. **Chat Management** (`/admin/chats`)
    - Search and filter chats
    - Message editing capabilities
    - Operator assignment tracking

20. **Admin Stats** (`/admin/stats`)
    - Platform-wide analytics
    - Operator performance rankings

21. **Admin Settings** (`/admin/settings`)
    - Platform configuration
    - App settings management

---

## Key Components

### Shared Components
- **GlassCard**: Glassmorphism card component
- **GlassButton**: Styled button with glass effect
- **GlassInput**: Form input with glass styling
- **ProfileCard**: Fictional user display card
- **ChatBubble**: Message display component
- **LoadingSpinner**: Consistent loading indicator
- **Modal**: Reusable modal component
- **Toast**: Notification system
- **Navigation**: Role-based navigation

### Specialized Components
- **LocationAutocomplete**: Location search with coordinates
- **ProfileCarousel**: Image carousel for profiles
- **ChatInterface**: Real-time chat component
- **OperatorQueue**: Assignment management interface
- **StatsChart**: Data visualization components
- **PaymentModal**: Paystack integration component
- **ProfileNotes**: Editable notes component

### Layout Components
- **AuthLayout**: For login/register pages
- **DashboardLayout**: For authenticated user pages
- **OperatorLayout**: For operator interface
- **AdminLayout**: For admin panel

---

## Domain & Email Setup

### Domain Requirements
To make the `name@fantooo.com` email system work, proper domain setup is essential.

### **Recommended Solution: Cloudflare Email Routing (FREE)**

#### Step 1: Domain Purchase
- **Buy `fantooo.com` from any domain registrar**:
  - Namecheap (~$12/year)
  - GoDaddy (~$15/year) 
  - Porkbun (~$9/year)
  - Google Domains (~$12/year)
- **You DON'T need to buy from Cloudflare** - any registrar works

#### Step 2: Cloudflare Setup
1. **Create free Cloudflare account**
2. **Add your domain to Cloudflare**:
   - Add site: `fantooo.com`
   - Change nameservers at your registrar to Cloudflare's
   - Wait for DNS propagation (24-48 hours)

#### Step 3: Email Routing Configuration
```bash
# In Cloudflare Dashboard:
# Email > Email Routing > Custom addresses

# Set up catch-all rule:
# *@fantooo.com → your-admin@gmail.com

# This means:
# francis@fantooo.com → forwards to your-admin@gmail.com
# sarah@fantooo.com → forwards to your-admin@gmail.com  
# ANY-NAME@fantooo.com → forwards to your-admin@gmail.com
```

#### Step 4: DNS Configuration (Automatic)
Cloudflare automatically sets up:
- MX records for mail routing
- SPF records for email authentication
- DKIM signatures for security

### **How It Works**
1. **User registers as "Francis"** → System creates `francis@fantooo.com`
2. **Paystack sends receipt** → Email goes to `francis@fantooo.com`
3. **Cloudflare receives email** → Forwards to your admin Gmail
4. **You receive all receipts** → In one centralized inbox

### **Benefits**
- ✅ **Completely FREE** (only pay for domain ~$10/year)
- ✅ **All emails are valid** and accepted
- ✅ **Paystack receipts work perfectly**
- ✅ **No email server management**
- ✅ **Centralized receipt collection**
- ✅ **Professional email addresses**

### **Cost Breakdown**
- Domain registration: ~$10-15/year
- Cloudflare Email Routing: FREE forever
- **Total annual cost: ~$10-15**

### **Implementation Notes**
- Users never need to access their `name@fantooo.com` emails
- All Paystack receipts forward to your admin email
- You can track all transactions in your dashboard
- Email addresses are legitimate and pass all validation

---

## Payment Integration (Paystack)

### Configuration
- Use Paystack's inline payment
- Handle receipts without email requirement
- Credit packages: 10, 25, 50, 100 credits
- Pricing: 1 credit = 10 KES

### Implementation
- Webhook for payment verification
- Automatic credit addition
- Transaction logging
- Failed payment handling

---

## Real-time Features

### WebSocket/Supabase Realtime
- Live chat messaging
- Operator assignment notifications
- User availability status
- Chat assignment updates

### State Management
- React Context for user data
- Real-time subscriptions for chats
- Optimistic updates for messaging
- Connection state monitoring

---

## Security Considerations

### Data Protection
- Row Level Security (RLS) on all tables
- API route protection with JWT
- Input validation and sanitization
- Rate limiting on sensitive endpoints

### Privacy Features
- No real location detection
- Fictional profile anonymity
- Secure password handling
- Message encryption options

---

## Performance Optimizations

### Frontend
- Image lazy loading
- Virtual scrolling for long lists
- Code splitting by route
- Optimized bundle size

### Backend
- Database indexing on frequently queried fields
- Connection pooling
- Caching frequently accessed data
- Efficient query optimization

---

## Development Workflow

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS with custom glassmorphism
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Paystack
- **Deployment**: Vercel
- **Real-time**: Supabase Realtime

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
NEXT_PUBLIC_APP_URL=
```

### Deployment Considerations
- Environment-specific configurations
- Database migrations
- Edge function deployments
- CDN setup for images
- SSL certificate configuration

---

## Future Enhancements

### Phase 2 Features
- Voice messages
- Video chat capabilities
- Advanced matching algorithms
- Mobile app development

### Analytics Integration
- User behavior tracking
- Conversion rate monitoring
- Performance metrics
- Business intelligence dashboard

This context document serves as the complete blueprint for building Fantooo. Each section provides detailed specifications for implementation while maintaining the core vision of a seamless fantasy chat platform.
