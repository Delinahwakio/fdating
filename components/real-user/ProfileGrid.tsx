'use client'

import { FictionalUser } from '@/types/database'
import { ProfileCard } from './ProfileCard'
import { useEffect, useRef, useCallback } from 'react'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface ProfileGridProps {
  profiles: FictionalUser[]
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
}

export const ProfileGrid = ({ profiles, loading, hasMore, onLoadMore }: ProfileGridProps) => {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries
      if (target.isIntersecting && hasMore && !loading) {
        onLoadMore()
      }
    },
    [hasMore, loading, onLoadMore]
  )

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) return

    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    })

    observerRef.current.observe(element)

    return () => {
      if (observerRef.current && element) {
        observerRef.current.unobserve(element)
      }
    }
  }, [handleObserver])

  if (profiles.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">No profiles found matching your preferences.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {profiles.map((profile, index) => (
          <ProfileCard 
            key={profile.id} 
            profile={profile} 
            priority={index < 4}
          />
        ))}
      </div>
      
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {loading && <LoadingSpinner />}
        </div>
      )}
      
      {!hasMore && profiles.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">You&apos;ve reached the end of the list</p>
        </div>
      )}
    </>
  )
}
