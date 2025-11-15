// Credit pricing
export const CREDIT_PRICE_KES = 10 // 10 KES per credit

// Credit packages
export const CREDIT_PACKAGES = [
  { credits: 10, price: 100, label: '10 Credits' },
  { credits: 25, price: 250, label: '25 Credits' },
  { credits: 50, price: 500, label: '50 Credits' },
  { credits: 100, price: 1000, label: '100 Credits' },
] as const

// Free messages per chat
export const FREE_MESSAGES_COUNT = 3

// Idle detection settings
export const IDLE_WARNING_TIME_MS = 4 * 60 * 1000 // 4 minutes
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
export const HEARTBEAT_INTERVAL_MS = 30 * 1000 // 30 seconds
export const IDLE_CHECK_INTERVAL_MS = 10 * 1000 // 10 seconds

// Message constraints
export const MAX_MESSAGE_LENGTH = 5000
export const MIN_MESSAGE_LENGTH = 1

// Age constraints
export const MIN_AGE = 18
export const MAX_AGE = 100

// Rate limiting
export const AUTH_RATE_LIMIT = {
  attempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
}

export const MESSAGE_RATE_LIMIT = {
  attempts: 30,
  windowMs: 60 * 1000, // 1 minute
}

export const API_RATE_LIMIT = {
  attempts: 100,
  windowMs: 60 * 1000, // 1 minute
}

// User roles
export const USER_ROLES = {
  REAL_USER: 'real_user',
  OPERATOR: 'operator',
  ADMIN: 'admin',
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]
