'use client'

import { FC } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import { RealUser } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'

interface RealUserWithStats extends RealUser {
  total_chats?: number
  total_messages?: number
  last_active?: string
}

interface RealUserCardProps {
  user: RealUserWithStats
  onClick: () => void
}

export const RealUserCard: FC<RealUserCardProps> = ({ user, onClick }) => {
  const getStatusColor = () => {
    if (!user.is_active) return 'bg-red-500'
    return 'bg-green-500'
  }

  const getStatusText = () => {
    if (!user.is_active) return 'Blocked'
    return 'Active'
  }

  return (
    <GlassCard
      className="p-6 cursor-pointer hover:border-primary-red/50 transition-all"
      onClick={onClick}
    >
      {/* Header with Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-50 mb-1">{user.display_name}</h3>
          <p className="text-sm text-gray-400">@{user.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <span className={`text-xs ${user.is_active ? 'text-green-400' : 'text-red-400'}`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Profile Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Email:</span>
          <span className="text-gray-300">{user.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Location:</span>
          <span className="text-gray-300">{user.location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Age:</span>
          <span className="text-gray-300">{user.age}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Gender:</span>
          <span className="text-gray-300 capitalize">{user.gender}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Looking for:</span>
          <span className="text-gray-300 capitalize">{user.looking_for}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="border-t border-white/10 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Credits:</span>
          <span className="text-gray-200 font-medium">{user.credits}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Total Chats:</span>
          <span className="text-gray-200 font-medium">{user.total_chats || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Messages Sent:</span>
          <span className="text-gray-200 font-medium">{user.total_messages || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Last Active:</span>
          <span className="text-gray-200 font-medium">
            {formatDistanceToNow(new Date(user.last_active || user.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Joined:</span>
          <span className="text-gray-200 font-medium">
            {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </GlassCard>
  )
}
