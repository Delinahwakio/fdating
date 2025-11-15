/**
 * Cache utilities for server-side caching using Next.js unstable_cache
 * Provides caching for fictional profiles with TTL and tag-based invalidation
 */

import { unstable_cache, revalidateTag } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { FictionalUser } from '@/types/database'

// Create a server-side Supabase client for caching operations
const getSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  )
}

/**
 * Cache fictional profiles by gender with 5-minute TTL
 * @param gender - The gender to filter profiles by
 * @returns Array of fictional users matching the gender
 */
export const getCachedFictionalProfiles = unstable_cache(
  async (gender: 'male' | 'female'): Promise<FictionalUser[]> => {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('fictional_users')
      .select('*')
      .eq('gender', gender)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching fictional profiles:', error)
      throw error
    }

    return data || []
  },
  ['fictional-profiles'],
  {
    revalidate: 300, // 5 minutes TTL
    tags: ['fictional-profiles'],
  }
)

/**
 * Cache all fictional profiles (for admin use) with 5-minute TTL
 * @returns Array of all fictional users
 */
export const getCachedAllFictionalProfiles = unstable_cache(
  async (): Promise<FictionalUser[]> => {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('fictional_users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all fictional profiles:', error)
      throw error
    }

    return data || []
  },
  ['fictional-profiles-all'],
  {
    revalidate: 300, // 5 minutes TTL
    tags: ['fictional-profiles', 'fictional-profiles-all'],
  }
)

/**
 * Cache a single fictional profile by ID with 5-minute TTL
 * @param profileId - The ID of the profile to fetch
 * @returns The fictional user or null if not found
 */
export const getCachedFictionalProfile = unstable_cache(
  async (profileId: string): Promise<FictionalUser | null> => {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('fictional_users')
      .select('*')
      .eq('id', profileId)
      .single()

    if (error) {
      console.error('Error fetching fictional profile:', error)
      return null
    }

    return data
  },
  ['fictional-profile'],
  {
    revalidate: 300, // 5 minutes TTL
    tags: ['fictional-profiles'],
  }
)

/**
 * Invalidate the fictional profiles cache
 * Call this when profiles are created, updated, or deleted
 */
export const invalidateFictionalProfilesCache = () => {
  revalidateTag('fictional-profiles')
  revalidateTag('fictional-profiles-all')
}

/**
 * Cache configuration constants
 */
export const CACHE_CONFIG = {
  FICTIONAL_PROFILES_TTL: 300, // 5 minutes in seconds
  FICTIONAL_PROFILES_TAG: 'fictional-profiles',
  FICTIONAL_PROFILES_ALL_TAG: 'fictional-profiles-all',
} as const
