'use client'

import { useState, FormEvent } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassInput } from '@/components/shared/GlassInput'
import { GlassButton } from '@/components/shared/GlassButton'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { validatePassword } from '@/lib/utils/validation'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface FormErrors {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
  general?: string
}

export default function OperatorSettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Validate current password
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required'
    }

    // Validate new password
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required'
    } else if (!validatePassword(formData.newPassword)) {
      newErrors.newPassword = 'Password must be at least 8 characters with uppercase, lowercase, and number'
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password'
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    // Check if new password is same as current
    if (formData.currentPassword && formData.newPassword && 
        formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const supabase = createClient()

      // First, verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: formData.currentPassword
      })

      if (signInError) {
        setErrors({ currentPassword: 'Current password is incorrect' })
        setIsSubmitting(false)
        return
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword
      })

      if (updateError) {
        throw updateError
      }

      // Show success message
      setShowSuccess(true)
      toast.success('Password changed successfully! Please sign in again.')

      // Clear form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })

      // Sign out and redirect to login after a short delay
      setTimeout(async () => {
        await supabase.auth.signOut()
        router.push('/op-login')
      }, 2000)

    } catch (error: any) {
      console.error('Error changing password:', error)
      setErrors({ 
        general: error.message || 'Failed to change password. Please try again.' 
      })
      toast.error('Failed to change password')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof PasswordFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-50 mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account settings and security</p>
        </div>

        {/* Account Information */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-gray-50 mb-4">Account Information</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <p className="text-gray-50">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
              <p className="text-gray-50">Operator</p>
            </div>
          </div>
        </GlassCard>

        {/* Password Change Form */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-gray-50 mb-4">Change Password</h2>
          
          {showSuccess && (
            <div className="mb-4 p-4 rounded-glass-sm bg-green-500/10 border border-green-500/50">
              <p className="text-green-400 text-sm">
                Password changed successfully! Redirecting to login...
              </p>
            </div>
          )}

          {errors.general && (
            <div className="mb-4 p-4 rounded-glass-sm bg-red-500/10 border border-red-500/50">
              <p className="text-red-400 text-sm">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <GlassInput
              type="password"
              label="Current Password"
              placeholder="Enter your current password"
              value={formData.currentPassword}
              onChange={handleInputChange('currentPassword')}
              error={errors.currentPassword}
              disabled={isSubmitting || showSuccess}
              autoComplete="current-password"
            />

            <GlassInput
              type="password"
              label="New Password"
              placeholder="Enter your new password"
              value={formData.newPassword}
              onChange={handleInputChange('newPassword')}
              error={errors.newPassword}
              helperText="Minimum 8 characters with at least one uppercase, one lowercase, and one number"
              disabled={isSubmitting || showSuccess}
              autoComplete="new-password"
            />

            <GlassInput
              type="password"
              label="Confirm New Password"
              placeholder="Confirm your new password"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              error={errors.confirmPassword}
              disabled={isSubmitting || showSuccess}
              autoComplete="new-password"
            />

            <div className="flex gap-3 pt-2">
              <GlassButton
                type="submit"
                variant="primary"
                disabled={isSubmitting || showSuccess}
                className="flex-1"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner />
                    Changing Password...
                  </span>
                ) : (
                  'Change Password'
                )}
              </GlassButton>
              
              <GlassButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setFormData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  })
                  setErrors({})
                }}
                disabled={isSubmitting || showSuccess}
              >
                Clear
              </GlassButton>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Password Requirements:</h3>
            <ul className="space-y-1 text-sm text-gray-500">
              <li className="flex items-center gap-2">
                <span className="text-gray-400">•</span>
                At least 8 characters long
              </li>
              <li className="flex items-center gap-2">
                <span className="text-gray-400">•</span>
                Contains at least one uppercase letter (A-Z)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-gray-400">•</span>
                Contains at least one lowercase letter (a-z)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-gray-400">•</span>
                Contains at least one number (0-9)
              </li>
            </ul>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
