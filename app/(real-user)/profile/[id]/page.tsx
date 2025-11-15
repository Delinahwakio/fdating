'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { FictionalUser } from '@/types/database'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'
import { ProfileCarousel } from '@/components/real-user/ProfileCarousel'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Heart, MessageCircle, MapPin } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function ProfileDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [profile, setProfile] = useState<FictionalUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)

  const supabase = createClient()
  const profileId = params.id as string

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('fictional_users')
          .select('*')
          .eq('id', profileId)
          .eq('is_active', true)
          .single()

        if (profileError) throw profileError
        setProfile(profileData)

        // Check if favorited
        if (user) {
          const { data: favoriteData } = await supabase
            .from('favorites')
            .select('id')
            .eq('real_user_id', user.id)
            .eq('fictional_user_id', profileId)
            .single()

          setIsFavorite(!!favoriteData)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
        toast.error('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [profileId, user, supabase])

  const handleFavoriteToggle = async () => {
    if (!user) {
      toast.error('Please log in to favorite profiles')
      return
    }

    setFavoriteLoading(true)

    try {
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('real_user_id', user.id)
          .eq('fictional_user_id', profileId)

        if (error) throw error
        setIsFavorite(false)
        toast.success('Removed from favorites')
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            real_user_id: user.id,
            fictional_user_id: profileId,
          })

        if (error) throw error
        setIsFavorite(true)
        toast.success('Added to favorites')
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Failed to update favorites')
    } finally {
      setFavoriteLoading(false)
    }
  }

  const handleStartChat = async () => {
    if (!user) {
      toast.error('Please log in to start chatting')
      return
    }

    setChatLoading(true)

    try {
      // Check if chat already exists
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .eq('real_user_id', user.id)
        .eq('fictional_user_id', profileId)
        .single()

      if (existingChat) {
        // Navigate to existing chat
        router.push(`/chat/${existingChat.id}`)
      } else {
        // Create new chat
        const { data: newChat, error } = await supabase
          .from('chats')
          .insert({
            real_user_id: user.id,
            fictional_user_id: profileId,
          })
          .select('id')
          .single()

        if (error) throw error

        if (newChat) {
          router.push(`/chat/${newChat.id}`)
        }
      }
    } catch (error) {
      console.error('Error starting chat:', error)
      toast.error('Failed to start chat')
    } finally {
      setChatLoading(false)
    }
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
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-gray-300 hover:text-white mb-6 flex items-center gap-2"
        >
          ← Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Carousel */}
          <div>
            <ProfileCarousel
              images={profile.profile_pictures}
              alt={profile.name}
            />
          </div>

          {/* Profile Details */}
          <div>
            <GlassCard className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-50 mb-2">
                    {profile.name}
                  </h1>
                  <p className="text-xl text-gray-300 mb-2">{profile.age} years old</p>
                  <div className="flex items-center gap-2 text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.location}</span>
                  </div>
                </div>

                <button
                  onClick={handleFavoriteToggle}
                  disabled={favoriteLoading}
                  className={`p-3 rounded-full transition-colors ${
                    isFavorite
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart
                    className={`w-6 h-6 ${isFavorite ? 'fill-white' : ''}`}
                  />
                </button>
              </div>

              {profile.bio && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-50 mb-2">About</h2>
                  <p className="text-gray-300 whitespace-pre-wrap">{profile.bio}</p>
                </div>
              )}

              <div className="space-y-3">
                <GlassButton
                  onClick={handleStartChat}
                  disabled={chatLoading}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {chatLoading ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      <MessageCircle className="w-5 h-5" />
                      Start Chat
                    </>
                  )}
                </GlassButton>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  )
}
