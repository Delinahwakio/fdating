# Requirements Document

## Introduction

Fantooo is a fantasy chat platform that connects real users with fictional profiles managed by operators. The system enables real-time messaging, credit-based monetization via Paystack, intelligent operator assignment with idle detection, and comprehensive admin controls. The platform uses a custom email system (name@fantooo.com) and focuses on quick onboarding, seamless chat experiences, and fair operator workload distribution.

## Glossary

- **Real User**: An authenticated person who registers on the platform to chat with fictional profiles
- **Fictional Profile**: A persona created by admins with profile details, managed by operators during chats
- **Operator**: A staff member who handles real-time conversations on behalf of multiple fictional profiles
- **Admin**: A privileged user who manages fictional profiles, operators, real users, and platform settings
- **Chat Session**: An active conversation between a real user and a fictional profile
- **Assignment System**: The mechanism that distributes chat sessions to available operators
- **Credit System**: The monetization model where users purchase credits to send messages beyond free limits
- **Idle Detection**: The automated monitoring system that tracks operator activity and reassigns inactive chats
- **Glassmorphism**: A UI design pattern using frosted glass effects with backdrop blur and transparency
- **Supabase**: The backend-as-a-service platform providing PostgreSQL database, authentication, and real-time features
- **Paystack**: The payment gateway used for credit purchases in Kenyan Shillings
- **RLS (Row Level Security)**: Database-level security policies that restrict data access based on user roles

---

## Requirements

### Requirement 1

**User Story:** As a new visitor, I want to quickly register with minimal information, so that I can start chatting with fictional profiles immediately

#### Acceptance Criteria

1. WHEN a visitor accesses the onboarding flow, THE Registration System SHALL collect name, location, gender, age, looking_for preference, and password in a multi-step form
2. WHEN a visitor submits a unique name, THE Registration System SHALL validate uniqueness against existing real_users and provide immediate feedback
3. WHEN a visitor completes registration, THE Registration System SHALL generate an email address in the format name@fantooo.com and create an authenticated session
4. THE Registration System SHALL validate that age is between 18 and 100 years
5. THE Registration System SHALL provide location autocomplete with latitude and longitude capture

### Requirement 2

**User Story:** As a real user, I want to browse and discover fictional profiles that match my preferences, so that I can choose who to chat with

#### Acceptance Criteria

1. WHEN a real user accesses the discover page, THE Profile Discovery System SHALL display fictional profiles matching the user's looking_for preference
2. THE Profile Discovery System SHALL present profiles in a grid layout with profile picture, name, age, location, and bio preview
3. WHEN a real user scrolls to the bottom of the page, THE Profile Discovery System SHALL load additional profiles using infinite scroll pagination
4. THE Profile Discovery System SHALL provide filter options for age range and location
5. WHEN a real user clicks on a profile card, THE Profile Discovery System SHALL navigate to the detailed profile view

### Requirement 3

**User Story:** As a real user, I want to view detailed information about a fictional profile, so that I can decide whether to start a chat

#### Acceptance Criteria

1. WHEN a real user views a fictional profile, THE Profile Display System SHALL show all profile pictures in a carousel format
2. THE Profile Display System SHALL display name, age, gender, location, and full bio
3. THE Profile Display System SHALL provide a favorite button that toggles the favorite status
4. THE Profile Display System SHALL provide a chat button that creates or navigates to an existing chat session
5. WHEN a real user favorites a profile, THE Profile Display System SHALL store the relationship in the favorites table

### Requirement 4

**User Story:** As a real user, I want to send messages to fictional profiles, so that I can have conversations

#### Acceptance Criteria

1. WHEN a real user sends their first three messages in a chat, THE Messaging System SHALL deliver messages without deducting credits
2. WHEN a real user sends their fourth or subsequent message, THE Messaging System SHALL deduct one credit from their balance before delivery
3. IF a real user has zero credits and attempts to send a paid message, THEN THE Messaging System SHALL display an insufficient credits error and prevent message delivery
4. THE Messaging System SHALL display messages in chronological order with sender identification and timestamps
5. THE Messaging System SHALL update message delivery and read status in real-time

### Requirement 5

**User Story:** As a real user, I want to purchase credits using Paystack, so that I can continue chatting beyond the free message limit

#### Acceptance Criteria

1. WHEN a real user accesses the credits page, THE Payment System SHALL display credit packages of 10, 25, 50, and 100 credits with pricing at 10 KES per credit
2. WHEN a real user selects a package, THE Payment System SHALL initiate Paystack inline payment with the user's email address
3. WHEN Paystack confirms payment via webhook, THE Payment System SHALL add purchased credits to the user's balance and log the transaction
4. THE Payment System SHALL update the user's credit balance in real-time after successful payment
5. IF payment fails, THEN THE Payment System SHALL log the failed transaction and notify the user

### Requirement 6

**User Story:** As a real user, I want to receive messages from fictional profiles in real-time, so that conversations feel natural and engaging

#### Acceptance Criteria

1. WHEN an operator sends a message as a fictional profile, THE Real-time Messaging System SHALL deliver the message to the real user within 2 seconds
2. THE Real-time Messaging System SHALL use Supabase Realtime subscriptions for message delivery
3. THE Real-time Messaging System SHALL display typing indicators when the fictional profile is composing a message
4. THE Real-time Messaging System SHALL update message read receipts when the real user views messages
5. THE Real-time Messaging System SHALL maintain connection state and reconnect automatically after network interruptions

### Requirement 7

**User Story:** As an operator, I want to be automatically assigned to waiting chats, so that I can start conversations without manual selection

#### Acceptance Criteria

1. WHEN an operator marks themselves as available, THE Assignment System SHALL assign the longest-waiting chat from the queue
2. THE Assignment System SHALL record assignment_time and assigned_operator_id in the chats table
3. THE Assignment System SHALL send a real-time notification to the operator with chat details
4. THE Assignment System SHALL prevent assigning multiple chats to the same operator simultaneously
5. THE Assignment System SHALL prioritize chats based on wait time in ascending order

### Requirement 8

**User Story:** As an operator, I want to view both the real user's profile and the fictional profile I'm managing, so that I can respond appropriately in character

#### Acceptance Criteria

1. WHEN an operator opens an assigned chat, THE Operator Interface SHALL display a three-panel layout with real user profile on the left, chat history in the center, and fictional profile on the right
2. THE Operator Interface SHALL display real user's name, age, gender, location, and profile picture in the left panel
3. THE Operator Interface SHALL display fictional profile's name, age, gender, location, bio, and profile pictures in the right panel
4. THE Operator Interface SHALL provide editable notes sections for both real and fictional profiles
5. WHEN an operator saves notes, THE Operator Interface SHALL persist changes to the chats table in real_profile_notes and fictional_profile_notes fields

### Requirement 9

**User Story:** As an operator, I want the system to track my activity, so that idle chats can be reassigned to maintain response quality

#### Acceptance Criteria

1. WHEN an operator performs any action in the chat interface, THE Idle Detection System SHALL update the last_operator_activity timestamp
2. THE Idle Detection System SHALL monitor operator actions including typing, sending messages, clicking, and mouse movement
3. THE Idle Detection System SHALL check all active chat assignments every 60 seconds for activity timeout
4. WHEN an operator has no activity for 5 minutes, THE Idle Detection System SHALL mark the chat as idle and trigger reassignment
5. THE Idle Detection System SHALL send a warning notification to the operator at the 4-minute mark before reassignment

### Requirement 10

**User Story:** As an operator, I want to be notified before my chat is reassigned due to inactivity, so that I can resume activity if I'm still available

#### Acceptance Criteria

1. WHEN an operator's idle time reaches 4 minutes, THE Notification System SHALL display a visual warning alert in the chat interface
2. THE Notification System SHALL play an audio notification for the idle warning
3. WHEN an operator performs any action after receiving the warning, THE Notification System SHALL reset the idle timer
4. THE Notification System SHALL display the remaining time until reassignment in the warning alert
5. WHEN reassignment occurs, THE Notification System SHALL notify the operator that the chat has been released

### Requirement 11

**User Story:** As the system, I want to reassign idle chats to available operators, so that real users receive timely responses

#### Acceptance Criteria

1. WHEN a chat is marked as idle, THE Reassignment System SHALL release the current operator assignment and return the chat to the queue
2. THE Reassignment System SHALL log the reassignment reason and previous operator in the chat_assignments table
3. THE Reassignment System SHALL assign the chat to the next available operator using the standard assignment logic
4. THE Reassignment System SHALL limit reassignments to 3 attempts per chat to prevent infinite loops
5. IF a chat reaches the maximum reassignment limit, THEN THE Reassignment System SHALL flag the chat for admin review

### Requirement 12

**User Story:** As an admin, I want to create and manage fictional profiles, so that real users have diverse options to chat with

#### Acceptance Criteria

1. WHEN an admin accesses the fictional profiles management page, THE Profile Management System SHALL display all fictional profiles with active status indicators
2. THE Profile Management System SHALL provide a form to create new fictional profiles with name, age, gender, location, bio, and multiple profile pictures
3. WHEN an admin submits a new fictional profile, THE Profile Management System SHALL validate required fields and save to the fictional_users table
4. THE Profile Management System SHALL allow editing existing fictional profiles with immediate updates
5. THE Profile Management System SHALL provide soft delete functionality by setting is_active to false

### Requirement 13

**User Story:** As an admin, I want to create operator accounts, so that staff can manage fictional profile conversations

#### Acceptance Criteria

1. WHEN an admin accesses the operator management page, THE Operator Management System SHALL display all operators with availability and activity status
2. THE Operator Management System SHALL provide a form to create new operator accounts with name and email
3. WHEN an admin creates an operator account, THE Operator Management System SHALL generate authentication credentials and send login instructions
4. THE Operator Management System SHALL allow admins to activate or deactivate operator accounts
5. THE Operator Management System SHALL display operator performance metrics including total messages sent and chats handled

### Requirement 14

**User Story:** As an admin, I want to monitor all active chats in real-time, so that I can ensure quality and intervene when necessary

#### Acceptance Criteria

1. WHEN an admin accesses the chat management page, THE Chat Monitoring System SHALL display all active chats in a grid with status indicators
2. THE Chat Monitoring System SHALL color-code chats based on status: green for active, yellow for approaching timeout, red for idle
3. THE Chat Monitoring System SHALL display current operator, response time, and idle duration for each chat
4. THE Chat Monitoring System SHALL update chat statuses in real-time using Supabase subscriptions
5. THE Chat Monitoring System SHALL provide filters for chat status, operator, and date range

### Requirement 15

**User Story:** As an admin, I want to view and edit any chat conversation, so that I can maintain quality and handle escalations

#### Acceptance Criteria

1. WHEN an admin clicks on a chat in the monitoring interface, THE Admin Chat Interface SHALL display the three-panel layout with full chat history
2. THE Admin Chat Interface SHALL allow inline editing of any message content
3. WHEN an admin edits a message, THE Admin Chat Interface SHALL log the modification with timestamp and admin identifier
4. THE Admin Chat Interface SHALL display which operator sent each message
5. THE Admin Chat Interface SHALL provide controls to reassign the chat, force close, or block the real user

### Requirement 16

**User Story:** As an admin, I want to manually reassign chats to different operators, so that I can balance workload or handle special situations

#### Acceptance Criteria

1. WHEN an admin views a chat, THE Manual Reassignment System SHALL display a reassign button with a list of available operators
2. WHEN an admin selects a new operator, THE Manual Reassignment System SHALL release the current assignment and assign to the selected operator
3. THE Manual Reassignment System SHALL log the manual reassignment with admin identifier and reason
4. THE Manual Reassignment System SHALL notify both the previous and new operators of the reassignment
5. THE Manual Reassignment System SHALL update the assignment_time to the current timestamp

### Requirement 17

**User Story:** As an admin, I want to view platform-wide analytics, so that I can make informed business decisions

#### Acceptance Criteria

1. WHEN an admin accesses the statistics page, THE Analytics System SHALL display total real users, fictional profiles, operators, and active chats
2. THE Analytics System SHALL show revenue metrics including total transactions, credits purchased, and revenue by date range
3. THE Analytics System SHALL display operator performance rankings by messages sent, chats handled, and average response time
4. THE Analytics System SHALL provide charts for user growth, message volume, and revenue trends over time
5. THE Analytics System SHALL allow filtering analytics by date range with preset options for today, week, month, and year

### Requirement 18

**User Story:** As a real user, I want my data to be secure and private, so that I can trust the platform with my information

#### Acceptance Criteria

1. THE Security System SHALL implement Row Level Security policies on all database tables restricting access based on user role
2. THE Security System SHALL ensure real users can only access their own profile data, messages, and chats
3. THE Security System SHALL hash and salt all passwords using Supabase Auth security standards
4. THE Security System SHALL validate and sanitize all user inputs to prevent SQL injection and XSS attacks
5. THE Security System SHALL implement rate limiting on authentication endpoints to prevent brute force attacks

### Requirement 19

**User Story:** As an operator, I want to see my performance statistics, so that I can track my productivity

#### Acceptance Criteria

1. WHEN an operator accesses the statistics page, THE Operator Stats System SHALL display total messages sent and chats handled
2. THE Operator Stats System SHALL show daily message counts for the past 30 days in a chart format
3. THE Operator Stats System SHALL calculate and display average response time per message
4. THE Operator Stats System SHALL show idle incident count and reassignment frequency
5. THE Operator Stats System SHALL update statistics in real-time as the operator handles chats

### Requirement 20

**User Story:** As a real user, I want the interface to be visually appealing with a modern dark theme, so that I enjoy using the platform

#### Acceptance Criteria

1. THE UI System SHALL implement a dark theme with primary background color #0F0F23 and secondary background #1A1A2E
2. THE UI System SHALL apply glassmorphism effects to all cards using backdrop-filter blur and semi-transparent backgrounds
3. THE UI System SHALL use the primary red color #DC2626 for all call-to-action buttons and accent elements
4. THE UI System SHALL ensure text contrast ratios meet WCAG AA standards with primary text color #F9FAFB
5. THE UI System SHALL apply consistent border-radius of 16px to all card components and 8px to input fields

### Requirement 21

**User Story:** As a real user, I want to manage my favorite fictional profiles, so that I can easily access profiles I'm interested in

#### Acceptance Criteria

1. WHEN a real user accesses the favorites page, THE Favorites System SHALL display all favorited fictional profiles in a grid layout
2. THE Favorites System SHALL provide a quick chat button on each favorite card
3. WHEN a real user unfavorites a profile from the favorites page, THE Favorites System SHALL remove the relationship and update the display
4. THE Favorites System SHALL show the last message timestamp for profiles with existing chats
5. THE Favorites System SHALL display an empty state message when no favorites exist

### Requirement 22

**User Story:** As a real user, I want to edit my profile information, so that I can keep my details current

#### Acceptance Criteria

1. WHEN a real user accesses their profile page, THE Profile Management System SHALL display current profile information in editable form fields
2. THE Profile Management System SHALL allow editing display_name, location, age, and looking_for preference
3. THE Profile Management System SHALL provide profile picture upload functionality with image preview
4. WHEN a real user saves profile changes, THE Profile Management System SHALL validate inputs and update the real_users table
5. THE Profile Management System SHALL prevent editing the unique name and email fields after registration

### Requirement 23

**User Story:** As an operator, I want to toggle my availability status, so that I control when I receive chat assignments

#### Acceptance Criteria

1. WHEN an operator accesses the waiting room, THE Availability System SHALL display a toggle switch for availability status
2. WHEN an operator sets availability to true, THE Availability System SHALL update is_available in the operators table and begin assigning chats
3. WHEN an operator sets availability to false, THE Availability System SHALL prevent new assignments but maintain current chat assignments
4. THE Availability System SHALL display the operator's current availability status prominently in the interface
5. THE Availability System SHALL show the number of chats waiting in the queue when the operator is available

### Requirement 24

**User Story:** As an admin, I want to configure platform settings, so that I can customize system behavior

#### Acceptance Criteria

1. WHEN an admin accesses the settings page, THE Configuration System SHALL display editable settings for idle timeout duration, maximum reassignments, and free message count
2. THE Configuration System SHALL validate that idle timeout is between 1 and 30 minutes
3. WHEN an admin saves settings, THE Configuration System SHALL persist changes and apply them to all active sessions
4. THE Configuration System SHALL display current credit pricing and allow updates
5. THE Configuration System SHALL provide a toggle for maintenance mode that displays a maintenance page to all non-admin users

### Requirement 25

**User Story:** As the system, I want to handle WebSocket disconnections gracefully, so that users experience minimal disruption

#### Acceptance Criteria

1. WHEN a WebSocket connection is lost, THE Connection Management System SHALL attempt automatic reconnection with exponential backoff
2. THE Connection Management System SHALL display connection status to users with indicators for connected, reconnecting, and disconnected states
3. WHEN connection is restored, THE Connection Management System SHALL sync missed messages and state updates
4. THE Connection Management System SHALL maintain message queue during disconnection and send queued messages upon reconnection
5. IF reconnection fails after 5 attempts, THEN THE Connection Management System SHALL prompt the user to refresh the page

### Requirement 26

**User Story:** As an admin, I want to block or suspend real users, so that I can moderate the platform and handle violations

#### Acceptance Criteria

1. WHEN an admin views a real user's profile, THE Moderation System SHALL provide block and suspend action buttons
2. WHEN an admin blocks a user, THE Moderation System SHALL set is_active to false and terminate all active chat sessions
3. THE Moderation System SHALL prevent blocked users from logging in with an appropriate error message
4. THE Moderation System SHALL allow admins to unblock users by setting is_active to true
5. THE Moderation System SHALL log all moderation actions with admin identifier, timestamp, and reason

### Requirement 27

**User Story:** As a real user, I want to view my transaction history, so that I can track my credit purchases

#### Acceptance Criteria

1. WHEN a real user accesses the credits page, THE Transaction History System SHALL display all past transactions in reverse chronological order
2. THE Transaction History System SHALL show transaction date, amount paid, credits purchased, and status for each transaction
3. THE Transaction History System SHALL display Paystack reference numbers for successful transactions
4. THE Transaction History System SHALL provide filtering options for transaction status and date range
5. THE Transaction History System SHALL show current credit balance prominently at the top of the page

### Requirement 28

**User Story:** As an operator, I want to change my password, so that I can maintain account security

#### Acceptance Criteria

1. WHEN an operator accesses the settings page, THE Password Management System SHALL provide a password change form with current password, new password, and confirm password fields
2. THE Password Management System SHALL validate that the current password is correct before allowing changes
3. THE Password Management System SHALL enforce password requirements of minimum 8 characters with at least one uppercase, one lowercase, and one number
4. WHEN an operator submits a valid password change, THE Password Management System SHALL update the password using Supabase Auth
5. THE Password Management System SHALL display success confirmation and require re-authentication after password change

### Requirement 29

**User Story:** As the system, I want to optimize database queries, so that the platform performs efficiently at scale

#### Acceptance Criteria

1. THE Database System SHALL create indexes on frequently queried fields including real_user_id, fictional_user_id, chat_id, and created_at
2. THE Database System SHALL implement connection pooling with a maximum of 20 concurrent connections
3. THE Database System SHALL use prepared statements for all parameterized queries to prevent SQL injection
4. THE Database System SHALL implement query result caching for fictional profiles with 5-minute TTL
5. THE Database System SHALL log slow queries exceeding 1 second for performance monitoring

### Requirement 30

**User Story:** As a developer, I want comprehensive error handling, so that issues are logged and users receive helpful feedback

#### Acceptance Criteria

1. WHEN an error occurs in any API route, THE Error Handling System SHALL log the error with stack trace, user context, and timestamp
2. THE Error Handling System SHALL return user-friendly error messages without exposing sensitive system information
3. THE Error Handling System SHALL categorize errors as client errors (4xx) or server errors (5xx) with appropriate HTTP status codes
4. THE Error Handling System SHALL implement global error boundaries in the React application to catch rendering errors
5. THE Error Handling System SHALL send critical errors to an error monitoring service for alerting
