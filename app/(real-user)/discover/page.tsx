'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { FictionalUser } from '@/types/database'
import { ProfileFilters, FilterState } from '@/components/real-user/ProfileFilters'
import { ProfileGrid } from '@/components/real-user/ProfileGrid'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

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

  // Fetch profiles
  const fetchProfiles = async (pageNum: number, resetProfiles = false) => {
    if (!lookingFor) return

    setLoading(true)

    try {
      let query = supabase
        .from('fictional_users')
        .select('*')
        .eq('gender', lookingFor)
        .eq('is_active', true)
        .gte('age', filters.minAge)
        .lte('age', filters.maxAge)
        .order('created_at', { ascending: false })
        .range(pageNum * PROFILES_PER_PAGE, (pageNum + 1) * PROFILES_PER_PAGE - 1)

      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`)
      }

      const { data, error } = await query

      if (error) throw error

      if (data) {
        if (resetProfiles) {
          setProfiles(data)
        } else {
          setProfiles((prev) => [...prev, ...data])
        }
        setHasMore(data.length === PROFILES_PER_PAGE)
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
