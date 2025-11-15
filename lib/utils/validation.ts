import { MIN_AGE, MAX_AGE, MAX_MESSAGE_LENGTH, MIN_MESSAGE_LENGTH } from './constants'

/**
 * Validation result type for detailed error messages
 */
export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates email with detailed error message
 */
export function validateEmailDetailed(email: string): ValidationResult {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' }
  }
  
  if (!validateEmail(email)) {
    return { isValid: false, error: 'Invalid email format' }
  }
  
  return { isValid: true }
}

/**
 * Validates Fantooo-specific email format (name@fantooo.com)
 */
export function validateFantoooEmail(email: string): boolean {
  const fantoooEmailRegex = /^[a-z0-9_]+@fantooo\.com$/
  return fantoooEmailRegex.test(email)
}

/**
 * Validates name (for registration - unique username format)
 */
export function validateName(name: string): boolean {
  // Name should be 3-20 characters, lowercase alphanumeric with underscores only
  const nameRegex = /^[a-z0-9_]{3,20}$/
  return nameRegex.test(name)
}

/**
 * Validates name with detailed error message
 */
export function validateNameDetailed(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Name is required' }
  }
  
  if (name.length < 3) {
    return { isValid: false, error: 'Name must be at least 3 characters' }
  }
  
  if (name.length > 20) {
    return { isValid: false, error: 'Name must be at most 20 characters' }
  }
  
  if (!/^[a-z0-9_]+$/.test(name)) {
    return { isValid: false, error: 'Name can only contain lowercase letters, numbers, and underscores' }
  }
  
  return { isValid: true }
}

/**
 * Validates display name (can contain spaces and more characters)
 */
export function validateDisplayName(displayName: string): boolean {
  // Display name should be 2-50 characters, alphanumeric with spaces and hyphens
  const displayNameRegex = /^[a-zA-Z0-9\s-]{2,50}$/
  return displayNameRegex.test(displayName)
}

/**
 * Validates display name with detailed error message
 */
export function validateDisplayNameDetailed(displayName: string): ValidationResult {
  if (!displayName || displayName.trim().length === 0) {
    return { isValid: false, error: 'Display name is required' }
  }
  
  if (displayName.length < 2) {
    return { isValid: false, error: 'Display name must be at least 2 characters' }
  }
  
  if (displayName.length > 50) {
    return { isValid: false, error: 'Display name must be at most 50 characters' }
  }
  
  if (!/^[a-zA-Z0-9\s-]+$/.test(displayName)) {
    return { isValid: false, error: 'Display name can only contain letters, numbers, spaces, and hyphens' }
  }
  
  return { isValid: true }
}

/**
 * Validates age
 */
export function validateAge(age: number): boolean {
  return age >= MIN_AGE && age <= MAX_AGE
}

/**
 * Validates age with detailed error message
 */
export function validateAgeDetailed(age: number | string): ValidationResult {
  const ageNum = typeof age === 'string' ? parseInt(age, 10) : age
  
  if (isNaN(ageNum)) {
    return { isValid: false, error: 'Age must be a valid number' }
  }
  
  if (ageNum < MIN_AGE) {
    return { isValid: false, error: `You must be at least ${MIN_AGE} years old` }
  }
  
  if (ageNum > MAX_AGE) {
    return { isValid: false, error: `Age must be at most ${MAX_AGE} years` }
  }
  
  return { isValid: true }
}

/**
 * Validates message content
 */
export function validateMessageContent(content: string): boolean {
  const length = content.trim().length
  return length >= MIN_MESSAGE_LENGTH && length <= MAX_MESSAGE_LENGTH
}

/**
 * Validates message content with detailed error message
 */
export function validateMessageContentDetailed(content: string): ValidationResult {
  if (!content || content.trim().length === 0) {
    return { isValid: false, error: 'Message cannot be empty' }
  }
  
  const trimmedLength = content.trim().length
  
  if (trimmedLength < MIN_MESSAGE_LENGTH) {
    return { isValid: false, error: `Message must be at least ${MIN_MESSAGE_LENGTH} character` }
  }
  
  if (trimmedLength > MAX_MESSAGE_LENGTH) {
    return { isValid: false, error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters` }
  }
  
  return { isValid: true }
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): boolean {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
  return passwordRegex.test(password)
}

/**
 * Validates password with detailed error message
 */
export function validatePasswordDetailed(password: string): ValidationResult {
  if (!password || password.length === 0) {
    return { isValid: false, error: 'Password is required' }
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' }
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' }
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' }
  }
  
  if (!/\d/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' }
  }
  
  return { isValid: true }
}

/**
 * Sanitizes input to prevent XSS attacks
 * Removes HTML tags, script tags, and dangerous characters
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''
  
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol
    .replace(/data:/gi, '')
    // Trim whitespace
    .trim()
}

/**
 * Sanitizes HTML content more aggressively
 * Use for user-generated content that will be displayed as HTML
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  
  return html
    // Remove all HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    // Remove the decoded tags again
    .replace(/<[^>]*>/g, '')
    .trim()
}

/**
 * Validates and sanitizes message content before database insertion
 */
export function validateAndSanitizeMessage(content: string): ValidationResult & { sanitized?: string } {
  const validation = validateMessageContentDetailed(content)
  
  if (!validation.isValid) {
    return validation
  }
  
  const sanitized = sanitizeInput(content)
  
  // Check if sanitization removed too much content
  if (sanitized.length < MIN_MESSAGE_LENGTH) {
    return { 
      isValid: false, 
      error: 'Message contains invalid characters or content' 
    }
  }
  
  return { 
    isValid: true, 
    sanitized 
  }
}

/**
 * Validates gender
 */
export function validateGender(gender: string): gender is 'male' | 'female' {
  return gender === 'male' || gender === 'female'
}

/**
 * Validates location string
 */
export function validateLocation(location: string): boolean {
  return location.trim().length >= 2 && location.trim().length <= 100
}

/**
 * Validates location with detailed error message
 */
export function validateLocationDetailed(location: string): ValidationResult {
  if (!location || location.trim().length === 0) {
    return { isValid: false, error: 'Location is required' }
  }
  
  if (location.trim().length < 2) {
    return { isValid: false, error: 'Location must be at least 2 characters' }
  }
  
  if (location.trim().length > 100) {
    return { isValid: false, error: 'Location must be at most 100 characters' }
  }
  
  return { isValid: true }
}

/**
 * Validates coordinates
 */
export function validateCoordinates(latitude: number, longitude: number): boolean {
  return (
    latitude >= -90 && 
    latitude <= 90 && 
    longitude >= -180 && 
    longitude <= 180
  )
}

/**
 * Validates bio text
 */
export function validateBio(bio: string): boolean {
  return bio.length <= 500
}

/**
 * Validates bio with detailed error message
 */
export function validateBioDetailed(bio: string): ValidationResult {
  if (bio.length > 500) {
    return { isValid: false, error: 'Bio must be at most 500 characters' }
  }
  
  return { isValid: true }
}

/**
 * Validates UUID format
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Validates credit amount
 */
export function validateCredits(credits: number): boolean {
  return Number.isInteger(credits) && credits >= 0
}

/**
 * Validates payment amount
 */
export function validatePaymentAmount(amount: number): boolean {
  return amount > 0 && amount <= 1000000 // Max 1M KES
}

/**
 * Generates Fantooo email from username
 */
export function generateFantoooEmail(name: string): string {
  // Convert name to lowercase and remove spaces
  const cleanName = name.toLowerCase().replace(/\s+/g, '')
  return `${cleanName}@fantooo.com`
}

/**
 * Validates all user inputs before database operations
 * Returns array of validation errors
 */
export function validateUserRegistration(data: {
  name: string
  displayName: string
  location: string
  gender: string
  lookingFor: string
  age: number
  password: string
}): string[] {
  const errors: string[] = []
  
  const nameValidation = validateNameDetailed(data.name)
  if (!nameValidation.isValid) errors.push(nameValidation.error!)
  
  const displayNameValidation = validateDisplayNameDetailed(data.displayName)
  if (!displayNameValidation.isValid) errors.push(displayNameValidation.error!)
  
  const locationValidation = validateLocationDetailed(data.location)
  if (!locationValidation.isValid) errors.push(locationValidation.error!)
  
  if (!validateGender(data.gender)) {
    errors.push('Gender must be either male or female')
  }
  
  if (!validateGender(data.lookingFor)) {
    errors.push('Looking for must be either male or female')
  }
  
  const ageValidation = validateAgeDetailed(data.age)
  if (!ageValidation.isValid) errors.push(ageValidation.error!)
  
  const passwordValidation = validatePasswordDetailed(data.password)
  if (!passwordValidation.isValid) errors.push(passwordValidation.error!)
  
  return errors
}
