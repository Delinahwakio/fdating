'use client'

import { useState } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'
import { GlassInput } from '@/components/shared/GlassInput'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { toast } from 'react-hot-toast'

interface OperatorFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export const OperatorForm = ({ onSuccess, onCancel }: OperatorFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      const response = await fetch('/api/admin/operators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create operator')
      }

      toast.success('Operator created successfully! Login credentials sent to their email.')
      onSuccess()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <GlassCard className="p-6 max-w-md w-full">
      <h2 className="text-2xl font-bold text-gray-50 mb-2">Create New Operator</h2>
      <p className="text-gray-400 text-sm mb-6">
        Create a new operator account. Login credentials will be automatically generated and sent
        to their email.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
            Full Name *
          </label>
          <GlassInput
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter operator's full name"
            disabled={loading}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
            Email Address *
          </label>
          <GlassInput
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="operator@example.com"
            disabled={loading}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-glass-sm">
          <div className="flex gap-2">
            <span className="text-blue-400">ℹ️</span>
            <div className="text-sm text-blue-300">
              <p className="font-medium mb-1">What happens next:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-400">
                <li>A secure password will be generated</li>
                <li>Login credentials will be sent to the email</li>
                <li>Operator can change password after first login</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <GlassButton
            type="button"
            onClick={onCancel}
            variant="secondary"
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </GlassButton>
          <GlassButton type="submit" disabled={loading} className="flex-1">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner />
                Creating...
              </span>
            ) : (
              'Create Operator'
            )}
          </GlassButton>
        </div>
      </form>
    </GlassCard>
  )
}
