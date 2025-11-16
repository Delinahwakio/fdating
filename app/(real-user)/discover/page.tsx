'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { FictionalUser } from '@/types/database'
import { ProfileFilters, FilterState } from '@/components/real-user/ProfileFilters'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

// Code splitting: Dynamically import ProfileGrid
const ProfileGrid = dynamic(
  () => import('@/components/real-user/ProfileGrid').then(mod => ({ default: mod.ProfileGrid })),
  {
    loading: () => (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    ),
    ssr: false
  }
)

const PROFILES_PER_PAGE = 12

export default function DiscoverPage() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<FictionalUser[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<FilterState>({
    minAge: 18,
    maxAge: 100,
    location: '',
  })
  const [lookingFor, setLookingFor] = useState<'male' | 'female' | null>(null)

  const supabase = createClient()

  // Fetch user's looking_for preference
  useEffect(() => {
    const fetchUserPreference = async () => {
      if (!user) return

      const { data } = await supabase
        .from('real_users')
        .select('looking_for')
        .eq('id', user.id)
        .single()

      if (data) {
        setLookingFor(data.looking_for)
      }
    }

    fetchUserPreference()
  }, [user, supabase])

  // Fetch profiles using cached API route
  const fetchProfiles = async (pageNum: number, resetProfiles = false) => {
    if (!lookingFor) return

    setLoading(true)

    try {
      // Build query parameters
      const params = new URLSearchParams({
        gender: lookingFor,
        minAge: filters.minAge.toString(),
        maxAge: filters.maxAge.toString(),
      })

      if (filters.location) {
        params.append('location', filters.location)
      }

      // Add userId to exclude profiles already in chats
      if (user) {
        params.append('userId', user.id)
      }

      // Fetch from cached API route
      const response = await fetch(`/api/fictional-profiles?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch profiles')
      }

      const { profiles: data } = await response.json()

      if (data) {
        // Apply pagination client-side since cache returns all matching profiles
        const startIndex = pageNum * PROFILES_PER_PAGE
        const endIndex = startIndex + PROFILES_PER_PAGE
        const paginatedData = data.slice(startIndex, endIndex)

        if (resetProfiles) {
          setProfiles(paginatedData)
        } else {
          setProfiles((prev) => [...prev, ...paginatedData])
        }
        setHasMore(endIndex < data.length)
      }
    } catch (error) {
      console.error('Error fetching profiles:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    if (lookingFor) {
      fetchProfiles(0, true)
    }
  }, [lookingFor])

  // Handle filter changes
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    setPage(0)
    setProfiles([])
    setHasMore(true)
  }

  // Apply filters
  useEffect(() => {
    if (lookingFor && page === 0 && profiles.length === 0) {
      fetchProfiles(0, true)
    }
  }, [filters, lookingFor])

  // Load more profiles
  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchProfiles(nextPage, false)
  }

  if (!user || !lookingFor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F23]">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#0F0F23]">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-50 mb-6">
          Discover Profiles
        </h1>

        <ProfileFilters onFilterChange={handleFilterChange} />

        {loading && profiles.length === 0 ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <ProfileGrid
            profiles={profiles}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
          />
        )}
      </div>
    </div>
  )
}
