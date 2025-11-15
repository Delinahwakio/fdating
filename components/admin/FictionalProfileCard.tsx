'use client'

import { FictionalUser } from '@/types/database'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'
import Image from 'next/image'

interface FictionalProfileCardProps {
  profile: FictionalUser
  onEdit: (profile: FictionalUser) => void
  onDelete: (profileId: string) => void
  onActivate: (profileId: string) => void
}

export const FictionalProfileCard = ({
  profile,
  onEdit,
  onDelete,
  onActivate,
}: FictionalProfileCardProps) => {
  const hasImages = profile.profile_pictures && profile.profile_pictures.length > 0
  const primaryImage = hasImages ? profile.profile_pictures[0] : null

  return (
    <GlassCard className="overflow-hidden hover:border-primary-red/30 transition-all">
      {/* Profile Image */}
      <div className="relative h-64 bg-gradient-to-br from-purple-900/20 to-pink-900/20">
        {primaryImage ? (
          <Image
            src={primaryImage}
            alt={profile.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl">
              {profile.gender === 'male' ? '👨' : '👩'}
            </span>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              profile.is_active
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {profile.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Image Count Badge */}
        {hasImages && profile.profile_pictures.length > 1 && (
          <div className="absolute bottom-3 right-3">
            <span className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-glass-sm text-xs text-white">
              📷 {profile.profile_pictures.length}
            </span>
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-xl font-bold text-gray-50 mb-1">{profile.name}</h3>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>{profile.age} years</span>
            <span>•</span>
            <span className="capitalize">{profile.gender}</span>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>📍</span>
            <span>{profile.location}</span>
          </div>
        </div>

        {profile.bio && (
          <p className="text-sm text-gray-300 mb-4 line-clamp-2">{profile.bio}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <GlassButton
            onClick={() => onEdit(profile)}
            className="flex-1 text-sm py-2"
            variant="secondary"
          >
            Edit
          </GlassButton>
          {profile.is_active ? (
            <GlassButton
              onClick={() => onDelete(profile.id)}
              className="flex-1 text-sm py-2 bg-red-500/10 hover:bg-red-500/20 border-red-500/30"
            >
              Deactivate
            </GlassButton>
          ) : (
            <GlassButton
              onClick={() => onActivate(profile.id)}
              className="flex-1 text-sm py-2 bg-green-500/10 hover:bg-green-500/20 border-green-500/30"
            >
              Activate
            </GlassButton>
          )}
        </div>

        {/* Metadata */}
        <div className="mt-3 pt-3 border-t border-white/10 text-xs text-gray-500">
          Created {new Date(profile.created_at).toLocaleDateString()}
        </div>
      </div>
    </GlassCard>
  )
}
