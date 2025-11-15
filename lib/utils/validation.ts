import { MIN_AGE, MAX_AGE, MAX_MESSAGE_LENGTH, MIN_MESSAGE_LENGTH } from './constants'

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateName(name: string): boolean {
  // Name should be 2-50 characters, alphanumeric with spaces and hyphens
  const nameRegex = /^[a-zA-Z0-9\s-]{2,50}$/
  return nameRegex.test(name)
}

export function validateAge(age: number): boolean {
  return age >= MIN_AGE && age <= MAX_AGE
}

export function validateMessageContent(content: string): boolean {
  const length = content.trim().length
  return length >= MIN_MESSAGE_LENGTH && length <= MAX_MESSAGE_LENGTH
}

export function validatePassword(password: string): boolean {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
  return passwordRegex.test(password)
}

export function sanitizeInput(input: string): string {
  // Remove potential XSS characters
  return input
    .replace(/[<>]/g, '')
    .trim()
}

export function validateGender(gender: string): gender is 'male' | 'female' {
  return gender === 'male' || gender === 'female'
}

export function generateFantoooEmail(name: string): string {
  // Convert name to lowercase and remove spaces
  const cleanName = name.toLowerCase().replace(/\s+/g, '')
  return `${cleanName}@fantooo.com`
}
