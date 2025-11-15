'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { RealUser } from '@/types/database'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassInput } from '@/components/shared/GlassInput'
import { GlassButton } from '@/components/shared/GlassButton'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import Image from 'next/image'
import { Camera, Save } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function ProfileManagementPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<RealUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    display_name: '',
    location: '',
    age: 18,
    looking_for: 'male' as 'male' | 'female',
  })

  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('real_users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) throw error

        if (data) {
          setProfile(data)
          setFormData({
            display_name: data.display_name,
            location: data.location,
            age: data.age,
            looking_for: data.looking_for,
          })
          if (data.profile_picture) {
            setImagePreview(data.profile_picture)
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
        toast.error('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user, supabase])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }

      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !profile) return

    // Validation
    if (formData.display_name.trim().length < 2) {
      toast.error('Display name must be at least 2 characters')
      return
    }

    if (formData.location.trim().length < 2) {
      toast.error('Location must be at least 2 characters')
      return
    }

    if (formData.age < 18 || formData.age > 100) {
      toast.error('Age must be between 18 and 100')
      return
    }

    setSaving(true)

    try {
      let profilePictureUrl = profile.profile_picture

      // Upload image if changed
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `profile-pictures/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(filePath, imageFile)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(filePath)

        profilePictureUrl = urlData.publicUrl
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('real_users')
        .update({
          display_name: formData.display_name.trim(),
          location: formData.location.trim(),
          age: formData.age,
          looking_for: formData.looking_for,
          profile_picture: profilePictureUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Update local state
      setProfile({
        ...profile,
        display_name: formData.display_name.trim(),
        location: formData.location.trim(),
        age: formData.age,
        looking_for: formData.looking_for,
        profile_picture: profilePictureUrl,
      })

      setImageFile(null)
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F23]">
        <LoadingSpinner />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F23]">
        <LoadingSpinner />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F23]">
        <GlassCard className="p-8">
          <p className="text-gray-300">Profile not found</p>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#0F0F23]">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-50 mb-6">
          My Profile
        </h1>

        <GlassCard className="p-6">
          <form onSubmit={handleSubmit}>
            {/* Profile Picture */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Profile Picture
              </label>
              <div className="flex items-center gap-6">
                <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-800">
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="Profile"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      No Image
                    </div>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="profile-picture"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    Change Photo
                  </label>
                  <input
                    id="profile-picture"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Max size: 5MB. Formats: JPG, PNG, GIF
                  </p>
                </div>
              </div>
            </div>

            {/* Non-editable fields */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username (Cannot be changed)
              </label>
              <GlassInput
                type="text"
                value={profile.name}
                disabled
                className="bg-gray-800/50 cursor-not-allowed"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email (Cannot be changed)
              </label>
              <GlassInput
                type="email"
                value={profile.email}
                disabled
                className="bg-gray-800/50 cursor-not-allowed"
              />
            </div>

            {/* Editable fields */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Display Name *
              </label>
              <GlassInput
                type="text"
                value={formData.display_name}
                onChange={(e) =>
                  setFormData({ ...formData, display_name: e.target.value })
                }
                required
                minLength={2}
                maxLength={50}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Location *
              </label>
              <GlassInput
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Age *
              </label>
              <GlassInput
                type="number"
                value={formData.age}
                onChange={(e) =>
                  setFormData({ ...formData, age: Number(e.target.value) })
                }
                required
                min={18}
                max={100}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Looking For *
              </label>
              <select
                value={formData.looking_for}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    looking_for: e.target.value as 'male' | 'female',
                  })
                }
                className="w-full px-4 py-3 bg-glass-light backdrop-blur-md border border-white/10 rounded-lg text-gray-50 focus:outline-none focus:border-red-600 transition-colors"
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            {/* Credits Display */}
            <div className="mb-6 p-4 bg-gray-800/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Available Credits</span>
                <span className="text-2xl font-bold text-red-600">
                  {profile.credits}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <GlassButton
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2"
            >
              {saving ? (
                <LoadingSpinner />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </GlassButton>
          </form>
        </GlassCard>
      </div>
    </div>
  )
}
