'use client'

import { FictionalUser } from '@/types/database'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { MessageCircle, Heart, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface FavoriteCardProps {
  profile: FictionalUser
  lastMessageAt?: string | null
  onUnfavorite: (profileId: string) => void
  onStartChat: (profileId: string) => void
}

export const FavoriteCard = ({
  profile,
  lastMessageAt,
  onUnfavorite,
  onStartChat,
}: FavoriteCardProps) => {
  const router = useRouter()

  const handleViewProfile = () => {
    router.push(`/profile/${profile.id}`)
  }

  return (
    <GlassCard className="overflow-hidden">
      <div className="relative w-full aspect-[3/4] cursor-pointer" onClick={handleViewProfile}>
        <Image
          src={profile.profile_pictures[0] || '/placeholder-profile.svg'}
          alt={profile.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          loading="lazy"
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMkQxQjRFO3N0b3Atb3BhY2l0eTowLjgiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMkQxQjRFO3N0b3Atb3BhY2l0eTowLjQiIC8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2dyYWQpIiAvPjwvc3ZnPg=="
        />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onUnfavorite(profile.id)
          }}
          className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
          aria-label="Remove from favorites"
        >
          <Heart className="w-5 h-5 fill-white" />
        </button>
      </div>
      <div className="p-4">
        <h3 className="text-xl font-bold text-gray-50 mb-1">{profile.name}</h3>
        <p className="text-gray-300 text-sm mb-3">
          {profile.age} • {profile.location}
        </p>

        {lastMessageAt && (
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-3">
            <Clock className="w-4 h-4" />
            <span>Last message {formatDistanceToNow(new Date(lastMessageAt), { addSuffix: true })}</span>
          </div>
        )}

        <GlassButton
          onClick={() => onStartChat(profile.id)}
          className="w-full flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Chat
        </GlassButton>
      </div>
    </GlassCard>
  )
}
