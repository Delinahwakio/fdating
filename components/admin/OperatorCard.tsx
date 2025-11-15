'use client'

import { Operator } from '@/types/database'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'

interface OperatorCardProps {
  operator: Operator & {
    total_chats?: number
    avg_response_time?: number
  }
  onEdit?: (operator: Operator) => void
  onToggleActive: (operatorId: string, isActive: boolean) => void
}

export const OperatorCard = ({
  operator,
  onEdit,
  onToggleActive,
}: OperatorCardProps) => {
  // Calculate status based on availability and activity
  const getStatusInfo = () => {
    if (!operator.is_active) {
      return {
        label: 'Deactivated',
        color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        dotColor: 'bg-gray-400',
      }
    }
    
    if (operator.is_available) {
      return {
        label: 'Available',
        color: 'bg-green-500/20 text-green-400 border-green-500/30',
        dotColor: 'bg-green-400',
      }
    }
    
    // Check if recently active (within last 5 minutes)
    const lastActivity = new Date(operator.last_activity)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const isRecentlyActive = lastActivity > fiveMinutesAgo
    
    if (isRecentlyActive) {
      return {
        label: 'Busy',
        color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        dotColor: 'bg-yellow-400',
      }
    }
    
    return {
      label: 'Offline',
      color: 'bg-red-500/20 text-red-400 border-red-500/30',
      dotColor: 'bg-red-400',
    }
  }

  const statusInfo = getStatusInfo()

  const formatLastActivity = () => {
    const lastActivity = new Date(operator.last_activity)
    const now = new Date()
    const diffMs = now.getTime() - lastActivity.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <GlassCard className="p-6 hover:border-primary-red/30 transition-all">
      {/* Header with Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-gray-50">{operator.name}</h3>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${statusInfo.dotColor} animate-pulse`} />
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
              >
                {statusInfo.label}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-400">{operator.email}</p>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-glass-light rounded-glass-sm">
        <div>
          <div className="text-2xl font-bold text-gray-50">{operator.total_messages || 0}</div>
          <div className="text-xs text-gray-400">Messages Sent</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-50">{operator.total_chats || 0}</div>
          <div className="text-xs text-gray-400">Chats Handled</div>
        </div>
      </div>

      {/* Activity Info */}
      <div className="mb-4 text-sm">
        <div className="flex items-center justify-between text-gray-400">
          <span>Last Activity:</span>
          <span className="text-gray-300">{formatLastActivity()}</span>
        </div>
        {operator.avg_response_time && (
          <div className="flex items-center justify-between text-gray-400 mt-1">
            <span>Avg Response:</span>
            <span className="text-gray-300">{operator.avg_response_time}s</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onEdit && (
          <GlassButton
            onClick={() => onEdit(operator)}
            className="flex-1 text-sm py-2"
            variant="secondary"
          >
            View Details
          </GlassButton>
        )}
        {operator.is_active ? (
          <GlassButton
            onClick={() => onToggleActive(operator.id, false)}
            className="flex-1 text-sm py-2 bg-red-500/10 hover:bg-red-500/20 border-red-500/30"
          >
            Deactivate
          </GlassButton>
        ) : (
          <GlassButton
            onClick={() => onToggleActive(operator.id, true)}
            className="flex-1 text-sm py-2 bg-green-500/10 hover:bg-green-500/20 border-green-500/30"
          >
            Activate
          </GlassButton>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-500">
        Joined {new Date(operator.created_at).toLocaleDateString()}
      </div>
    </GlassCard>
  )
}
