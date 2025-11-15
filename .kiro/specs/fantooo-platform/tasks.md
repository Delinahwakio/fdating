# Implementation Plan

- [x] 1. Initialize Next.js project and configure Supabase





  - Create Next.js 14 app with TypeScript and Tailwind CSS
  - Install and configure Supabase client libraries
  - Set up environment variables for Supabase and Paystack
  - Configure Tailwind with custom glassmorphism utilities and color palette
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [x] 2. Set up Supabase database schema and security





- [x] 2.1 Create database tables with constraints


  - Write migration for real_users, fictional_users, chats, messages, operators, admins, favorites, transactions, operator_stats, operator_activity, and chat_assignments tables
  - Add CHECK constraints for age, gender, credits, and message length
  - Add UNIQUE constraints for email, name, and chat combinations
  - _Requirements: 1.3, 1.4, 2.1, 4.2, 5.1, 18.1_

- [x] 2.2 Create database indexes for performance


  - Add indexes on frequently queried fields (real_user_id, fictional_user_id, chat_id, created_at)
  - Create composite indexes for assignment queue and active chats
  - _Requirements: 29.1, 29.2_

- [x] 2.3 Implement Row Level Security policies


  - Write RLS policies for real_users table (users view own, operators view assigned, admins view all)
  - Write RLS policies for messages table (users and operators view assigned chats, operators insert as fictional)
  - Write RLS policies for chats table (users view own, operators view assigned, admins manage all)
  - Write RLS policies for other tables with appropriate access controls
  - _Requirements: 18.1, 18.2_

- [x] 2.4 Create database functions for business logic


  - Write assign_chat_to_operator function with queue logic and locking
  - Write release_and_reassign_chat function for idle timeout handling
  - Write get_available_fictional_profiles function with gender filtering
  - Write update_operator_stats function for daily statistics
  - _Requirements: 7.1, 7.2, 7.5, 11.1, 11.2_

- [ ] 3. Build shared UI components with glassmorphism design
- [ ] 3.1 Create base glass components
  - Implement GlassCard component with backdrop blur and transparency
  - Implement GlassButton component with hover effects and variants
  - Implement GlassInput component with focus states
  - _Requirements: 20.2, 20.3, 20.5_

- [ ] 3.2 Create utility components
  - Implement Modal component with overlay and animations
  - Implement Toast notification system with success/error/info variants
  - Implement LoadingSpinner component
  - _Requirements: 30.2_

- [ ] 3.3 Create layout components
  - Implement AuthLayout for public pages
  - Implement DashboardLayout for real user pages with navigation
  - Implement OperatorLayout for operator interface
  - Implement AdminLayout for admin panel
  - _Requirements: 20.1, 20.2_

- [ ] 4. Implement authentication system
- [ ] 4.1 Set up Supabase Auth configuration
  - Create Supabase client utilities for browser and server
  - Implement auth middleware for route protection
  - Create AuthContext with role detection
  - _Requirements: 18.3_

- [ ] 4.2 Build real user onboarding flow
  - Create multi-step registration form (name, location, gender, age, looking_for, password)
  - Implement name uniqueness validation with real-time feedback
  - Add location autocomplete with latitude/longitude capture
  - Generate email in name@fantooo.com format on registration
  - Create authenticated session after successful registration
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 4.3 Build operator and admin login pages
  - Create operator login page with email/password authentication
  - Create admin login page with email/password authentication
  - Implement role-based redirects after login
  - _Requirements: 18.2_

- [ ] 5. Build real user profile discovery and management
- [ ] 5.1 Create fictional profile discovery page
  - Fetch fictional profiles matching user's looking_for preference
  - Display profiles in responsive grid layout with profile cards
  - Implement infinite scroll pagination
  - Add filter controls for age range and location
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 5.2 Create fictional profile detail page
  - Display full profile information with image carousel
  - Implement favorite toggle button with database persistence
  - Add chat button that creates or navigates to existing chat
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5.3 Create favorites page
  - Display grid of favorited fictional profiles
  - Add quick chat button on each card
  - Show last message timestamp for existing chats
  - Implement unfavorite functionality
  - Display empty state when no favorites exist
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_

- [ ] 5.4 Create user profile management page
  - Display current profile information in editable form
  - Allow editing display_name, location, age, and looking_for
  - Implement profile picture upload with preview
  - Validate inputs and update real_users table on save
  - Prevent editing name and email fields
  - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

- [ ] 6. Implement real-time messaging for real users
- [ ] 6.1 Create chat interface component
  - Build message list with sender identification and timestamps
  - Implement message input with character limit
  - Add credit status indicator showing remaining credits
  - Display free message count (first 3 messages)
  - _Requirements: 4.4, 6.1_

- [ ] 6.2 Implement message sending with credit system
  - Create API route for sending messages
  - Check message count to determine if message is free
  - Deduct credit for 4th and subsequent messages
  - Return error if user has insufficient credits
  - Insert message into database and update chat last_message_at
  - _Requirements: 4.1, 4.2, 4.3, 5.4_

- [ ] 6.3 Set up real-time message subscriptions
  - Subscribe to messages table filtered by chat_id using Supabase Realtime
  - Implement optimistic UI updates for instant feedback
  - Handle message delivery and read receipts
  - Add typing indicators using presence channels
  - Implement connection state monitoring with reconnection logic
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 25.1, 25.2, 25.3, 25.4, 25.5_

- [ ] 7. Implement credit purchase system with Paystack
- [ ] 7.1 Create credits page with purchase interface
  - Display current credit balance prominently
  - Show credit packages (10, 25, 50, 100 credits) with pricing
  - Implement package selection UI
  - Display transaction history with filtering
  - _Requirements: 5.1, 27.1, 27.2, 27.3, 27.4, 27.5_

- [ ] 7.2 Integrate Paystack inline payment
  - Load Paystack inline JS library
  - Implement payment modal with selected package
  - Initialize Paystack payment with user email and amount
  - Handle payment callback and verification
  - _Requirements: 5.2_

- [ ] 7.3 Create Paystack webhook handler
  - Verify webhook signature for security
  - Handle charge.success event
  - Create transaction record in database
  - Add purchased credits to user balance
  - _Requirements: 5.3, 5.4_

- [ ] 7.4 Write tests for payment flow
  - Test credit deduction logic for messages
  - Test insufficient credits error handling
  - Test webhook signature verification
  - Test transaction record creation
  - _Requirements: 5.5_

- [ ] 8. Build operator assignment and queue system
- [ ] 8.1 Create operator waiting room interface
  - Display availability toggle switch
  - Show number of chats waiting in queue
  - Display operator's current availability status
  - Show assignment notification when chat is assigned
  - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_

- [ ] 8.2 Implement automatic chat assignment
  - Create API route that calls assign_chat_to_operator function
  - Verify operator is available before assignment
  - Fetch full chat details with real user and fictional user data
  - Send real-time notification to operator
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 8.3 Handle operator availability toggling
  - Update is_available field in operators table
  - Trigger assignment when operator becomes available
  - Prevent new assignments when operator is unavailable
  - Maintain current assignments when toggling off
  - _Requirements: 23.2, 23.3, 23.5_

- [ ] 9. Build operator three-panel chat interface
- [ ] 9.1 Create three-panel layout component
  - Implement left panel for real user profile display
  - Implement center panel for chat history and message input
  - Implement right panel for fictional profile display
  - Make layout responsive with proper spacing
  - _Requirements: 8.1_

- [ ] 9.2 Implement profile display panels
  - Display real user's name, age, gender, location, and profile picture in left panel
  - Display fictional profile's name, age, gender, location, bio, and pictures in right panel
  - Add editable notes sections for both profiles
  - Implement save functionality that persists to chats table
  - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [ ] 9.3 Implement operator message sending
  - Create API route for operator to send messages as fictional user
  - Verify operator is assigned to the chat
  - Insert message with sender_type='fictional' and handled_by_operator_id
  - Update chat last_message_at timestamp
  - Broadcast message via Supabase Realtime
  - _Requirements: 6.1, 6.2_

- [ ] 10. Implement idle detection and reassignment system
- [ ] 10.1 Create client-side activity tracking
  - Track operator actions (typing, clicks, mouse movement, keydown)
  - Update last activity timestamp on any interaction
  - Send heartbeat to server every 30 seconds with activity timestamp
  - Store activity in operator_activity table
  - _Requirements: 9.1, 9.2_

- [ ] 10.2 Implement idle warning system
  - Check idle time locally every 10 seconds
  - Display visual warning alert at 4-minute mark
  - Play audio notification for idle warning
  - Show remaining time until reassignment
  - Reset timer when operator performs action after warning
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 10.3 Create server-side idle detection cron job
  - Create API route for cron job with secret verification
  - Query chats with assignment_time older than 5 minutes
  - Check operator_activity table for recent activity
  - Call release_and_reassign_chat function for idle chats
  - Log reassignment with reason in chat_assignments table
  - _Requirements: 9.3, 9.4, 9.5, 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 10.4 Configure Vercel cron job
  - Add cron configuration to vercel.json for idle detection endpoint
  - Set schedule to run every minute
  - Test cron job execution
  - _Requirements: 9.3_

- [ ] 11. Build operator statistics page
- [ ] 11.1 Create operator stats display
  - Show total messages sent and chats handled
  - Display daily message counts for past 30 days in chart
  - Calculate and show average response time
  - Show idle incident count and reassignment frequency
  - _Requirements: 19.1, 19.2, 19.3, 19.4_

- [ ] 11.2 Implement real-time stats updates
  - Update statistics as operator handles chats
  - Use Supabase Realtime to subscribe to operator_stats changes
  - _Requirements: 19.5_

- [ ] 12. Build admin fictional profile management
- [ ] 12.1 Create fictional profiles list page
  - Display all fictional profiles with active status indicators
  - Show profile cards with name, age, gender, location
  - Add create new profile button
  - Implement search and filter functionality
  - _Requirements: 13.1_

- [ ] 12.2 Implement fictional profile CRUD operations
  - Create form for new fictional profile with all fields
  - Validate required fields (name, age, gender, location)
  - Handle multiple profile picture uploads
  - Implement edit functionality for existing profiles
  - Add soft delete by setting is_active to false
  - _Requirements: 13.2, 13.3, 13.4, 13.5_

- [ ] 13. Build admin operator management
- [ ] 13.1 Create operators list page
  - Display all operators with availability and activity status
  - Show operator performance metrics (messages, chats handled)
  - Add create new operator button
  - Display color-coded status indicators
  - _Requirements: 13.1, 13.5_

- [ ] 13.2 Implement operator account creation
  - Create form for new operator with name and email
  - Generate authentication credentials using Supabase Auth
  - Send login instructions to operator email
  - Store operator record in operators table
  - _Requirements: 13.2, 13.3_

- [ ] 13.3 Implement operator activation/deactivation
  - Add toggle for is_active status
  - Prevent deactivated operators from logging in
  - Display deactivation status in operator list
  - _Requirements: 13.4_

- [ ] 14. Build admin chat monitoring interface
- [ ] 14.1 Create live chat monitoring grid
  - Display all active chats in grid layout
  - Show current operator, response time, and idle duration
  - Implement color-coded status (green=active, yellow=warning, red=idle)
  - Add filters for status, operator, and date range
  - _Requirements: 14.1, 14.2, 14.3, 14.5_

- [ ] 14.2 Implement real-time chat status updates
  - Subscribe to chats table changes using Supabase Realtime
  - Update grid in real-time as chat statuses change
  - Show live idle timers for each chat
  - _Requirements: 14.4_

- [ ] 14.3 Create admin chat detail view
  - Display three-panel layout with full chat history
  - Show which operator sent each message
  - Provide controls to reassign, force close, or block user
  - _Requirements: 15.1, 15.4, 15.5_

- [ ] 14.4 Implement admin message editing
  - Add inline edit functionality for any message
  - Log message modifications with timestamp and admin ID
  - Update message content in database
  - _Requirements: 15.2, 15.3_

- [ ] 14.5 Implement manual chat reassignment
  - Display reassign button with list of available operators
  - Release current assignment and assign to selected operator
  - Log manual reassignment with admin ID and reason
  - Notify both previous and new operators
  - Update assignment_time to current timestamp
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ] 15. Build admin analytics dashboard
- [ ] 15.1 Create platform statistics overview
  - Display total real users, fictional profiles, operators, and active chats
  - Show revenue metrics (total transactions, credits purchased, revenue by date)
  - Implement date range filtering with presets
  - _Requirements: 17.1, 17.5_

- [ ] 15.2 Implement operator performance rankings
  - Display operator rankings by messages sent, chats handled, and response time
  - Show performance metrics in sortable table
  - _Requirements: 17.3_

- [ ] 15.3 Create analytics charts
  - Implement user growth chart over time
  - Create message volume chart by date
  - Add revenue trends chart
  - Use chart library for data visualization
  - _Requirements: 17.4_

- [ ] 16. Build admin user moderation
- [ ] 16.1 Create real users management page
  - Display all real users with profile information
  - Show user activity status and credit balance
  - Add search and filter functionality
  - _Requirements: 26.1_

- [ ] 16.2 Implement user blocking and suspension
  - Add block and suspend buttons on user profile view
  - Set is_active to false when blocking user
  - Terminate all active chat sessions for blocked user
  - Prevent blocked users from logging in
  - _Requirements: 26.2, 26.3_

- [ ] 16.3 Implement user unblocking
  - Add unblock button for blocked users
  - Set is_active to true to restore access
  - _Requirements: 26.4_

- [ ] 16.4 Log moderation actions
  - Record all moderation actions with admin ID, timestamp, and reason
  - Display moderation history for each user
  - _Requirements: 26.5_

- [ ] 17. Build admin settings page
- [ ] 17.1 Create platform configuration interface
  - Display editable settings for idle timeout duration, max reassignments, and free message count
  - Validate idle timeout is between 1 and 30 minutes
  - Persist settings changes to configuration table
  - Apply settings to all active sessions
  - _Requirements: 24.1, 24.2, 24.3_

- [ ] 17.2 Implement credit pricing configuration
  - Display current credit pricing
  - Allow admins to update pricing per credit
  - _Requirements: 24.4_

- [ ] 17.3 Add maintenance mode toggle
  - Implement maintenance mode setting
  - Display maintenance page to non-admin users when enabled
  - _Requirements: 24.5_

- [ ] 18. Implement operator password management
- [ ] 18.1 Create operator settings page
  - Display password change form with current, new, and confirm password fields
  - Validate current password before allowing change
  - Enforce password requirements (min 8 chars, uppercase, lowercase, number)
  - Update password using Supabase Auth
  - Display success confirmation and require re-authentication
  - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5_

- [ ] 19. Implement error handling and validation
- [ ] 19.1 Create error handling utilities
  - Implement AppError class with status codes and error codes
  - Create errorHandler function for API routes
  - Handle Supabase-specific errors (duplicate, foreign key)
  - Return user-friendly error messages
  - _Requirements: 30.1, 30.2, 30.3_

- [ ] 19.2 Implement React error boundaries
  - Create ErrorBoundary component for catching rendering errors
  - Display user-friendly error UI with refresh option
  - Log errors for monitoring
  - _Requirements: 30.4_

- [ ] 19.3 Add input validation utilities
  - Implement validation functions for email, name, age, message content
  - Add input sanitization to prevent XSS attacks
  - Validate all user inputs before database operations
  - _Requirements: 18.4_

- [ ] 19.4 Implement rate limiting
  - Set up rate limiting for authentication endpoints (5 attempts per 15 minutes)
  - Add rate limiting for message sending (30 per minute)
  - Implement general API rate limiting (100 requests per minute)
  - Return 429 status when rate limit exceeded
  - _Requirements: 18.5_

- [ ] 20. Optimize performance and add caching
- [ ] 20.1 Implement code splitting
  - Use dynamic imports for heavy components (chat interface, charts)
  - Add loading states for dynamically imported components
  - _Requirements: 29.3_

- [ ] 20.2 Optimize images
  - Use Next.js Image component for all profile pictures
  - Implement lazy loading for images
  - Add blur placeholders for better UX
  - _Requirements: 29.3_

- [ ] 20.3 Implement caching for fictional profiles
  - Cache fictional profiles query results with 5-minute TTL
  - Use Next.js unstable_cache for server-side caching
  - Invalidate cache when profiles are updated
  - _Requirements: 29.4_

- [ ] 20.4 Set up database connection pooling
  - Configure Supabase client with connection pooling
  - Set maximum concurrent connections to 20
  - _Requirements: 29.2_

- [ ] 21. Configure deployment and environment
- [ ] 21.1 Set up environment variables
  - Create .env.local with all required variables
  - Document environment variables in README
  - Set up production environment variables in Vercel
  - _Requirements: All_

- [ ] 21.2 Configure Vercel deployment
  - Create vercel.json with build and cron configuration
  - Set up automatic deployments from main branch
  - Configure custom domain
  - _Requirements: All_

- [ ] 21.3 Deploy Supabase migrations
  - Run all database migrations in production
  - Verify RLS policies are active
  - Test database functions
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 21.4 Set up monitoring and logging
  - Configure error monitoring service
  - Set up logging for critical errors
  - Monitor slow queries and performance
  - _Requirements: 30.5_
