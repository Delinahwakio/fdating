/**
 * Supabase Storage utilities for profile picture management
 */

import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'

// Storage bucket names
export const STORAGE_BUCKETS = {
  REAL_USER_PROFILES: 'real-user-profiles',
  FICTIONAL_USER_PROFILES: 'fictional-user-profiles'
} as const

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  PROFILE_PICTURE: 5 * 1024 * 1024 // 5MB
} as const

// Allowed MIME types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
] as const

/**
 * Upload a real user profile picture
 */
export async function uploadRealUserProfilePicture(
  userId: string,
  file: File
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  try {
    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      return { url: null, error: validation.error! }
    }

    const supabase = createClient()

    // Generate file path
    const fileExt = file.name.split('.').pop()
    const filePath = `${userId}/profile.${fileExt}`

    // Delete old profile picture if exists
    await supabase.storage
      .from(STORAGE_BUCKETS.REAL_USER_PROFILES)
      .remove([filePath])

    // Upload new file
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.REAL_USER_PROFILES)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      return { url: null, error: uploadError.message }
    }

    // Get public URL
    const { data } = supabase.storage
      .from(STORAGE_BUCKETS.REAL_USER_PROFILES)
      .getPublicUrl(filePath)

    return { url: data.publicUrl, error: null }
  } catch (error) {
    return {
      url: null,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Upload fictional user profile pictures (multiple)
 */
export async function uploadFictionalUserProfilePictures(
  fictionalUserId: string,
  files: File[]
): Promise<{ urls: string[]; error: null } | { urls: null; error: string }> {
  try {
    // Validate all files
    for (const file of files) {
      const validation = validateImageFile(file)
      if (!validation.valid) {
        return { urls: null, error: validation.error! }
      }
    }

    const supabase = createClient()
    const urls: string[] = []

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileExt = file.name.split('.').pop()
      const filePath = `${fictionalUserId}/${i + 1}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.FICTIONAL_USER_PROFILES)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        return { urls: null, error: uploadError.message }
      }

      // Get public URL
      const { data } = supabase.storage
        .from(STORAGE_BUCKETS.FICTIONAL_USER_PROFILES)
        .getPublicUrl(filePath)

      urls.push(data.publicUrl)
    }

    return { urls, error: null }
  } catch (error) {
    return {
      urls: null,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Delete a real user profile picture
 */
export async function deleteRealUserProfilePicture(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient()

    // List all files in user's folder
    const { data: files, error: listError } = await supabase.storage
      .from(STORAGE_BUCKETS.REAL_USER_PROFILES)
      .list(userId)

    if (listError) {
      return { success: false, error: listError.message }
    }

    if (!files || files.length === 0) {
      return { success: true, error: null }
    }

    // Delete all files
    const filePaths = files.map(file => `${userId}/${file.name}`)
    const { error: deleteError } = await supabase.storage
      .from(STORAGE_BUCKETS.REAL_USER_PROFILES)
      .remove(filePaths)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    return { success: true, error: null }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    }
  }
}

/**
 * Delete fictional user profile pictures
 */
export async function deleteFictionalUserProfilePictures(
  fictionalUserId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient()

    // List all files in fictional user's folder
    const { data: files, error: listError } = await supabase.storage
      .from(STORAGE_BUCKETS.FICTIONAL_USER_PROFILES)
      .list(fictionalUserId)

    if (listError) {
      return { success: false, error: listError.message }
    }

    if (!files || files.length === 0) {
      return { success: true, error: null }
    }

    // Delete all files
    const filePaths = files.map(file => `${fictionalUserId}/${file.name}`)
    const { error: deleteError } = await supabase.storage
      .from(STORAGE_BUCKETS.FICTIONAL_USER_PROFILES)
      .remove(filePaths)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    return { success: true, error: null }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    }
  }
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): {
  valid: boolean
  error?: string
} {
  // Check file size
  if (file.size > FILE_SIZE_LIMITS.PROFILE_PICTURE) {
    return {
      valid: false,
      error: `File size must be less than ${FILE_SIZE_LIMITS.PROFILE_PICTURE / 1024 / 1024}MB`
    }
  }

  // Check MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: 'File must be JPEG, PNG, or WebP'
    }
  }

  return { valid: true }
}

/**
 * Get public URL for a storage file (server-side)
 */
export async function getStoragePublicUrl(
  bucket: string,
  filePath: string
): Promise<string> {
  const supabase = await createServerClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
  return data.publicUrl
}

/**
 * Convert file to base64 for preview
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}
