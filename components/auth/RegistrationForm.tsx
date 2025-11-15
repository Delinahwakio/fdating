'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'
import { GlassInput } from '@/components/shared/GlassInput'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { createClient } from '@/lib/supabase/client'

type Step = 1 | 2 | 3

interface FormData {
  name: string
  displayName: string
  location: string
  latitude: number | null
  longitude: number | null
  gender: 'male' | 'female' | ''
  lookingFor: 'male' | 'female' | ''
  age: string
  password: string
  confirmPassword: string
}

export function RegistrationForm() {
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null)
  const [checkingName, setCheckingName] = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState<FormData>({
    name: '',
    displayName: '',
    location: '',
    latitude: null,
    longitude: null,
    gender: '',
    lookingFor: '',
    age: '',
    password: '',
    confirmPassword: '',
  })

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const checkNameAvailability = async (name: string) => {
    if (name.length < 3) {
      setNameAvailable(null)
      return
    }

    setCheckingName(true)
    try {
      const { data, error } = await supabase
        .from('real_users')
        .select('name')
        .eq('name', name)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking name:', error)
        setNameAvailable(null)
      } else {
        setNameAvailable(!data)
      }
    } catch (err) {
      console.error('Error checking name:', err)
      setNameAvailable(null)
    } finally {
      setCheckingName(false)
    }
  }

  const handleNameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    updateField('name', sanitized)
    
    // Debounce name check
    const timeoutId = setTimeout(() => {
      checkNameAvailability(sanitized)
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  const validateStep1 = (): boolean => {
    if (formData.name.length < 3 || formData.name.length > 20) {
      setError('Name must be between 3 and 20 characters')
      return false
    }

    if (!/^[a-z0-9_]+$/.test(formData.name)) {
      setError('Name can only contain lowercase letters, numbers, and underscores')
      return false
    }

    if (!nameAvailable) {
      setError('This name is already taken')
      return false
    }

    if (!formData.displayName.trim()) {
      setError('Display name is required')
      return false
    }

    if (!formData.location.trim()) {
      setError('Location is required')
      return false
    }

    return true
  }

  const validateStep2 = (): boolean => {
    if (!formData.gender) {
      setError('Please select your gender')
      return false
    }

    if (!formData.lookingFor) {
      setError('Please select who you want to chat with')
      return false
    }

    const age = parseInt(formData.age)
    if (isNaN(age) || age < 18 || age > 100) {
      setError('Age must be between 18 and 100')
      return false
    }

    return true
  }

  const validateStep3 = (): boolean => {
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return false
    }

    if (!/[A-Z]/.test(formData.password)) {
      setError('Password must contain at least one uppercase letter')
      return false
    }

    if (!/[a-z]/.test(formData.password)) {
      setError('Password must contain at least one lowercase letter')
      return false
    }

    if (!/[0-9]/.test(formData.password)) {
      setError('Password must contain at least one number')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    return true
  }

  const handleNext = () => {
    setError(null)

    if (step === 1 && validateStep1()) {
      setStep(2)
    } else if (step === 2 && validateStep2()) {
      setStep(3)
    }
  }

  const handleBack = () => {
    setError(null)
    if (step > 1) {
      setStep((step - 1) as Step)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateStep3()) {
      return
    }

    setLoading(true)

    try {
      await signUp({
        name: formData.name,
        displayName: formData.displayName,
        location: formData.location,
        latitude: formData.latitude,
        longitude: formData.longitude,
        gender: formData.gender as 'male' | 'female',
        lookingFor: formData.lookingFor as 'male' | 'female',
        age: parseInt(formData.age),
        password: formData.password,
      })

      router.push('/discover')
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.message || 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <GlassCard className="w-full max-w-md p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-50 mb-2">
          {step === 1 && 'Create Your Account'}
          {step === 2 && 'Tell Us About Yourself'}
          {step === 3 && 'Secure Your Account'}
        </h2>
        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                s <= step ? 'bg-red-600' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <GlassInput
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="johndoe"
                disabled={loading}
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                Your email will be {formData.name || 'username'}@fantooo.com
              </p>
              {checkingName && (
                <p className="mt-1 text-xs text-gray-400">Checking availability...</p>
              )}
              {nameAvailable === true && formData.name.length >= 3 && (
                <p className="mt-1 text-xs text-green-400">✓ Name is available</p>
              )}
              {nameAvailable === false && (
                <p className="mt-1 text-xs text-red-400">✗ Name is already taken</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Display Name
              </label>
              <GlassInput
                type="text"
                value={formData.displayName}
                onChange={(e) => updateField('displayName', e.target.value)}
                placeholder="John Doe"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Location
              </label>
              <GlassInput
                type="text"
                value={formData.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="Nairobi, Kenya"
                disabled={loading}
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                Enter your city or region
              </p>
            </div>

            <GlassButton
              type="button"
              onClick={handleNext}
              disabled={loading || !nameAvailable}
              className="w-full"
            >
              Next
            </GlassButton>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                I am
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateField('gender', 'male')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.gender === 'male'
                      ? 'border-red-600 bg-red-600/20'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                  disabled={loading}
                >
                  <span className="text-lg">👨</span>
                  <p className="mt-1 text-sm text-gray-200">Male</p>
                </button>
                <button
                  type="button"
                  onClick={() => updateField('gender', 'female')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.gender === 'female'
                      ? 'border-red-600 bg-red-600/20'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                  disabled={loading}
                >
                  <span className="text-lg">👩</span>
                  <p className="mt-1 text-sm text-gray-200">Female</p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Looking to chat with
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateField('lookingFor', 'male')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.lookingFor === 'male'
                      ? 'border-red-600 bg-red-600/20'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                  disabled={loading}
                >
                  <span className="text-lg">👨</span>
                  <p className="mt-1 text-sm text-gray-200">Men</p>
                </button>
                <button
                  type="button"
                  onClick={() => updateField('lookingFor', 'female')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.lookingFor === 'female'
                      ? 'border-red-600 bg-red-600/20'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                  disabled={loading}
                >
                  <span className="text-lg">👩</span>
                  <p className="mt-1 text-sm text-gray-200">Women</p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Age
              </label>
              <GlassInput
                type="number"
                value={formData.age}
                onChange={(e) => updateField('age', e.target.value)}
                placeholder="25"
                min="18"
                max="100"
                disabled={loading}
                required
              />
            </div>

            <div className="flex gap-3">
              <GlassButton
                type="button"
                onClick={handleBack}
                disabled={loading}
                variant="secondary"
                className="flex-1"
              >
                Back
              </GlassButton>
              <GlassButton
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="flex-1"
              >
                Next
              </GlassButton>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <GlassInput
                type="password"
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                At least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <GlassInput
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                required
              />
            </div>

            <div className="flex gap-3">
              <GlassButton
                type="button"
                onClick={handleBack}
                disabled={loading}
                variant="secondary"
                className="flex-1"
              >
                Back
              </GlassButton>
              <GlassButton
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Create Account'}
              </GlassButton>
            </div>
          </div>
        )}
      </form>
    </GlassCard>
  )
}
