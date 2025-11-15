'use client'

import { useState, useEffect } from 'react'
import { FictionalUser } from '@/types/database'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'
import { GlassInput } from '@/components/shared/GlassInput'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { validateAge } from '@/lib/utils/validation'
import Image from 'next/image'

interface FictionalProfileFormProps {
  profile: FictionalUser | null
  onSuccess: () => void
  onCancel: () => void
}

interface FormData {
  name: string
  age: string
  gender: 'male' | 'female'
  location: string
  bio: string
}

export const FictionalProfileForm = ({
  profile,
  onSuccess,
  onCancel,
}: FictionalProfileFormProps) => {
  const [formData, setFormData] = useState<FormData>({
    name: profile?.name || '',
    age: profile?.age.toString() || '',
    gender: profile?.gender || 'female',
    location: profile?.location || '',
    bio: profile?.bio || '',
  })

  const [profilePictures, setProfilePictures] = useState<string[]>(
    profile?.profile_pictures || []
  )
  const [uploadingImages, setUploadingImages] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const supabase = createClient()

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    const age = parseInt(formData.age)
    if (!formData.age) {
      newErrors.age = 'Age is required'
    } else if (isNaN(age) || !validateAge(age)) {
      newErrors.age = 'Age must be between 18 and 100'
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error for this field
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImages(true)

    try {
      const uploadedUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`)
          continue
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`)
          continue
        }

        // Create unique filename
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `fictional-profiles/${fileName}`

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('fictional-user-profiles')
          .upload(filePath, file)

        if (error) {
          toast.error(`Failed to upload ${file.name}: ${error.message}`)
          continue
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('fictional-user-profiles').getPublicUrl(filePath)

        uploadedUrls.push(publicUrl)
      }

      if (uploadedUrls.length > 0) {
        setProfilePictures((prev) => [...prev, ...uploadedUrls])
        toast.success(`${uploadedUrls.length} image(s) uploaded successfully`)
      }
    } catch (error: any) {
      toast.error('Failed to upload images: ' + error.message)
    } finally {
      setUploadingImages(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const handleRemoveImage = (index: number) => {
    setProfilePictures((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const profileData = {
        name: formData.name.trim(),
        age: parseInt(formData.age),
        gender: formData.gender,
        location: formData.location.trim(),
        bio: formData.bio.trim() || null,
        profile_pictures: profilePictures,
        is_active: true,
        ...(profile ? {} : { created_by: user?.id || null }),
      }

      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from('fictional_users')
          .update(profileData)
          .eq('id', profile.id)

        if (error) throw error

        // Invalidate cache
        await fetch('/api/fictional-profiles/invalidate', { method: 'POST' })

        toast.success('Profile updated successfully')
      } else {
        // Create new profile
        const { error } = await supabase.from('fictional_users').insert(profileData)

        if (error) throw error

        // Invalidate cache
        await fetch('/api/fictional-profiles/invalidate', { method: 'POST' })

        toast.success('Profile created successfully')
      }

      onSuccess()
    } catch (error: any) {
      toast.error('Failed to save profile: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GlassCard className="p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-50 mb-6">
        {profile ? 'Edit Profile' : 'Create New Profile'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Name <span className="text-red-500">*</span>
          </label>
          <GlassInput
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter profile name"
            className="w-full"
          />
          {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
        </div>

        {/* Age and Gender */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Age <span className="text-red-500">*</span>
            </label>
            <GlassInput
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              placeholder="18-100"
              min="18"
              max="100"
              className="w-full"
            />
            {errors.age && <p className="mt-1 text-sm text-red-400">{errors.age}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-glass-light border border-white/10 rounded-glass-sm text-gray-300 focus:outline-none focus:border-primary-red"
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Location <span className="text-red-500">*</span>
          </label>
          <GlassInput
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="e.g., Nairobi, Kenya"
            className="w-full"
          />
          {errors.location && <p className="mt-1 text-sm text-red-400">{errors.location}</p>}
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            placeholder="Write a brief bio..."
            rows={4}
            className="w-full px-4 py-2 bg-glass-light border border-white/10 rounded-glass-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-primary-red resize-none"
          />
          <p className="mt-1 text-xs text-gray-500">{formData.bio.length} characters</p>
        </div>

        {/* Profile Pictures */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Profile Pictures
          </label>

          {/* Image Grid */}
          {profilePictures.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-3">
              {profilePictures.map((url, index) => (
                <div key={index} className="relative aspect-square rounded-glass-sm overflow-hidden group">
                  <Image
                    src={url}
                    alt={`Profile ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="200px"
                    loading={index < 3 ? undefined : 'lazy'}
                    placeholder="blur"
                    blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMkQxQjRFO3N0b3Atb3BhY2l0eTowLjgiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMkQxQjRFO3N0b3Atb3BhY2l0eTowLjQiIC8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2dyYWQpIiAvPjwvc3ZnPg=="
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  {index === 0 && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs text-white">
                      Primary
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={uploadingImages}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className={`flex items-center justify-center gap-2 px-4 py-3 bg-glass-light border border-white/10 rounded-glass-sm text-gray-300 cursor-pointer hover:bg-glass transition-all ${
                uploadingImages ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploadingImages ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Upload Images</span>
                </>
              )}
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Upload multiple images (max 5MB each). First image will be the primary photo.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <GlassButton
            type="button"
            onClick={onCancel}
            variant="secondary"
            className="flex-1"
            disabled={submitting}
          >
            Cancel
          </GlassButton>
          <GlassButton type="submit" className="flex-1" disabled={submitting || uploadingImages}>
            {submitting ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Saving...</span>
              </>
            ) : profile ? (
              'Update Profile'
            ) : (
              'Create Profile'
            )}
          </GlassButton>
        </div>
      </form>
    </GlassCard>
  )
}
