'use client'

import { GlassCard } from '@/components/shared/GlassCard'

interface PerformanceStats {
  total_messages: number
  total_chats: number
  avg_response_time_seconds: number
  idle_incidents: number
  daily_stats: Array<{
    date: string
    messages_sent: number
    chats_handled: number
  }>
}

interface OperatorStatsDisplayProps {
  stats: PerformanceStats
}

export const OperatorStatsDisplay = ({ stats }: OperatorStatsDisplayProps) => {
  // Format average response time
  const formatResponseTime = (seconds: number): string => {
    if (seconds === 0) return 'N/A'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  // Calculate reassignment frequency
  const calculateReassignmentFrequency = (): string => {
    if (stats.total_chats === 0) return '0%'
    const frequency = (stats.idle_incidents / stats.total_chats) * 100
    return `${frequency.toFixed(1)}%`
  }

  const statCards = [
    {
      label: 'Total Messages Sent',
      value: stats.total_messages.toLocaleString(),
      icon: '💬',
      color: 'text-blue-400'
    },
    {
      label: 'Chats Handled',
      value: stats.total_chats.toLocaleString(),
      icon: '👥',
      color: 'text-green-400'
    },
    {
      label: 'Avg Response Time',
      value: formatResponseTime(stats.avg_response_time_seconds),
      icon: '⚡',
      color: 'text-yellow-400'
    },
    {
      label: 'Idle Incidents',
      value: stats.idle_incidents.toLocaleString(),
      icon: '⏰',
      color: 'text-red-400'
    },
    {
      label: 'Reassignment Rate',
      value: calculateReassignmentFrequency(),
      icon: '🔄',
      color: 'text-purple-400'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {statCards.map((card, index) => (
        <GlassCard key={index} className="p-6">
          <div className="flex items-start justify-between mb-3">
            <span className="text-3xl">{card.icon}</span>
          </div>
          <div className={`text-3xl font-bold mb-1 ${card.color}`}>
            {card.value}
          </div>
          <div className="text-sm text-gray-400">{card.label}</div>
        </GlassCard>
      ))}
    </div>
  )
}
