'use client'

import { FictionalUser } from '@/types/database'
import { GlassCard } from '@/components/shared/GlassCard'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { FICTIONAL_PROFILE_BLUR, imageSizes } from '@/lib/utils/imageOptimization'

interface ProfileCardProps {
  profile: FictionalUser
  priority?: boolean
}

export const ProfileCard = ({ profile, priority = false }: ProfileCardProps) => {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/profile/${profile.id}`)
  }

  return (
    <GlassCard onClick={handleClick} className="overflow-hidden">
      <div className="relative w-full aspect-[3/4]">
        <Image
          src={profile.profile_pictures[0] || '/placeholder-profile.svg'}
          alt={profile.name}
          fill
          className="object-cover"
          sizes={imageSizes.profileCard}
          loading={priority ? undefined : 'lazy'}
          priority={priority}
          placeholder="blur"
          blurDataURL={FICTIONAL_PROFILE_BLUR}
        />
      </div>
      <div className="p-4">
        <h3 className="text-xl font-bold text-gray-50 mb-1">{profile.name}</h3>
        <p className="text-gray-300 text-sm mb-2">
          {profile.age} • {profile.location}
        </p>
        {profile.bio && (
          <p className="text-gray-400 text-sm line-clamp-2">{profile.bio}</p>
        )}
      </div>
    </GlassCard>
  )
}
