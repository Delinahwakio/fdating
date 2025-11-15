'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { FictionalUser } from '@/types/database'
import { FavoriteCard } from '@/components/real-user/FavoriteCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { GlassCard } from '@/components/shared/GlassCard'
import { Heart } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface FavoriteWithChat {
  profile: FictionalUser
  lastMessageAt: string | null
}

export default function FavoritesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [favorites, setFavorites] = useState<FavoriteWithChat[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return

      try {
        // Fetch favorites with profile data
        const { data: favoritesData, error: favoritesError } = await supabase
          .from('favorites')
          .select(`
            fictional_user_id,
            fictional_users (*)
          `)
          .eq('real_user_id', user.id)
          .order('created_at', { ascending: false })

        if (favoritesError) throw favoritesError

        // Fetch chat data for each favorite
        const favoritesWithChats = await Promise.all(
          (favoritesData || []).map(async (fav: any) => {
            const { data: chatData } = await supabase
              .from('chats')
              .select('last_message_at')
              .eq('real_user_id', user.id)
              .eq('fictional_user_id', fav.fictional_user_id)
              .single()

            return {
              profile: fav.fictional_users,
              lastMessageAt: chatData?.last_message_at || null,
            }
          })
        )

        setFavorites(favoritesWithChats)
      } catch (error) {
        console.error('Error fetching favorites:', error)
        toast.error('Failed to load favorites')
      } finally {
        setLoading(false)
      }
    }

    fetchFavorites()
  }, [user, supabase])

  const handleUnfavorite = async (profileId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('real_user_id', user.id)
        .eq('fictional_user_id', profileId)

      if (error) throw error

      setFavorites((prev) => prev.filter((fav) => fav.profile.id !== profileId))
      toast.success('Removed from favorites')
    } catch (error) {
      console.error('Error removing favorite:', error)
      toast.error('Failed to remove from favorites')
    }
  }

  const handleStartChat = async (profileId: string) => {
    if (!user) return

    try {
      // Check if chat already exists
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .eq('real_user_id', user.id)
        .eq('fictional_user_id', profileId)
        .single()

      if (existingChat) {
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

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#0F0F23]">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-50 mb-6">
          My Favorites
        </h1>

        {favorites.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-300 mb-2">
              No favorites yet
            </h2>
            <p className="text-gray-400 mb-6">
              Start exploring profiles and add your favorites to see them here
            </p>
            <button
              onClick={() => router.push('/discover')}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Discover Profiles
            </button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((favorite) => (
              <FavoriteCard
                key={favorite.profile.id}
                profile={favorite.profile}
                lastMessageAt={favorite.lastMessageAt}
                onUnfavorite={handleUnfavorite}
                onStartChat={handleStartChat}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
