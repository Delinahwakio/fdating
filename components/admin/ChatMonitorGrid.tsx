'use client'

import { useState, useEffect } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'
import { Chat, Operator, RealUser, FictionalUser } from '@/types/database'

interface ChatWithDetails extends Chat {
  real_user: RealUser
  fictional_user: FictionalUser
  operator?: Operator | null
}

interface ChatMonitorGridProps {
  chats: ChatWithDetails[]
  onChatClick: (chat: ChatWithDetails) => void
}

type StatusFilter = 'all' | 'active' | 'warning' | 'idle'

export const ChatMonitorGrid = ({ chats, onChatClick }: ChatMonitorGridProps) => {
  const [filteredChats, setFilteredChats] = useState<ChatWithDetails[]>(chats)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [operatorFilter, setOperatorFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')

  // Get unique operators for filter
  const operators = Array.from(
    new Map(
      chats
        .filter((chat) => chat.operator)
        .map((chat) => [chat.operator!.id, chat.operator!])
    ).values()
  )

  useEffect(() => {
    filterChats()
  }, [chats, statusFilter, operatorFilter, dateFilter])

  const getChatStatus = (chat: ChatWithDetails) => {
    if (!chat.assigned_operator_id || !chat.assignment_time) {
      return { status: 'idle', color: 'red', label: 'Unassigned' }
    }

    const assignmentTime = new Date(chat.assignment_time)
    const now = new Date()
    const idleMinutes = (now.getTime() - assignmentTime.getTime()) / 60000

    // Check operator activity
    if (chat.operator?.last_activity) {
      const lastActivity = new Date(chat.operator.last_activity)
      const activityMinutes = (now.getTime() - lastActivity.getTime()) / 60000

      if (activityMinutes >= 5) {
        return { status: 'idle', color: 'red', label: 'Idle' }
      }
      if (activityMinutes >= 4) {
        return { status: 'warning', color: 'yellow', label: 'Warning' }
      }
    }

    return { status: 'active', color: 'green', label: 'Active' }
  }

  const getIdleDuration = (chat: ChatWithDetails) => {
    if (!chat.assignment_time) return 'N/A'

    const assignmentTime = new Date(chat.assignment_time)
    const now = new Date()
    const diffMs = now.getTime() - assignmentTime.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 1) return '< 1m'
    if (diffMins < 60) return `${diffMins}m`
    return `${diffHours}h ${diffMins % 60}m`
  }

  const getResponseTime = (chat: ChatWithDetails) => {
    if (!chat.last_message_at) return 'N/A'

    const lastMessage = new Date(chat.last_message_at)
    const now = new Date()
    const diffMs = now.getTime() - lastMessage.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const filterChats = () => {
    let filtered = [...chats]

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((chat) => {
        const { status } = getChatStatus(chat)
        return status === statusFilter
      })
    }

    // Operator filter
    if (operatorFilter !== 'all') {
      filtered = filtered.filter(
        (chat) => chat.assigned_operator_id === operatorFilter
      )
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      filtered = filtered.filter((chat) => {
        const chatDate = new Date(chat.created_at)
        const diffHours = (now.getTime() - chatDate.getTime()) / 3600000

        if (dateFilter === 'today') return diffHours < 24
        if (dateFilter === 'week') return diffHours < 168
        if (dateFilter === 'month') return diffHours < 720
        return true
      })
    }

    setFilteredChats(filtered)
  }

  const getStatusCounts = () => {
    const active = chats.filter((chat) => getChatStatus(chat).status === 'active').length
    const warning = chats.filter((chat) => getChatStatus(chat).status === 'warning').length
    const idle = chats.filter((chat) => getChatStatus(chat).status === 'idle').length

    return { active, warning, idle }
  }

  const statusCounts = getStatusCounts()

  return (
    <div>
      {/* Filters */}
      <GlassCard className="p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-4 py-2 bg-glass-light border border-white/10 rounded-glass-sm text-gray-300 focus:outline-none focus:border-primary-red"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="warning">Warning</option>
            <option value="idle">Idle</option>
          </select>

          {/* Operator Filter */}
          <select
            value={operatorFilter}
            onChange={(e) => setOperatorFilter(e.target.value)}
            className="px-4 py-2 bg-glass-light border border-white/10 rounded-glass-sm text-gray-300 focus:outline-none focus:border-primary-red"
          >
            <option value="all">All Operators</option>
            {operators.map((operator) => (
              <option key={operator.id} value={operator.id}>
                {operator.name}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 bg-glass-light border border-white/10 rounded-glass-sm text-gray-300 focus:outline-none focus:border-primary-red"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>

        {/* Stats */}
        <div className="mt-4 flex flex-wrap gap-6 text-sm">
          <div className="text-gray-400">
            Total: <span className="text-gray-200 font-medium">{chats.length}</span>
          </div>
          <div className="text-gray-400">
            Active:{' '}
            <span className="text-green-400 font-medium">{statusCounts.active}</span>
          </div>
          <div className="text-gray-400">
            Warning:{' '}
            <span className="text-yellow-400 font-medium">{statusCounts.warning}</span>
          </div>
          <div className="text-gray-400">
            Idle:{' '}
            <span className="text-red-400 font-medium">{statusCounts.idle}</span>
          </div>
          <div className="text-gray-400">
            Showing: <span className="text-gray-200 font-medium">{filteredChats.length}</span>
          </div>
        </div>
      </GlassCard>

      {/* Chat Grid */}
      {filteredChats.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <div className="text-gray-400">No chats match your filters</div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChats.map((chat) => {
            const { status, color, label } = getChatStatus(chat)
            const statusColors = {
              green: {
                bg: 'bg-green-500/20',
                text: 'text-green-400',
                border: 'border-green-500/30',
                dot: 'bg-green-400',
              },
              yellow: {
                bg: 'bg-yellow-500/20',
                text: 'text-yellow-400',
                border: 'border-yellow-500/30',
                dot: 'bg-yellow-400',
              },
              red: {
                bg: 'bg-red-500/20',
                text: 'text-red-400',
                border: 'border-red-500/30',
                dot: 'bg-red-400',
              },
            }

            const colors = statusColors[color as keyof typeof statusColors]

            return (
              <GlassCard
                key={chat.id}
                className={`p-6 cursor-pointer hover:border-primary-red/50 transition-all border-2 ${colors.border}`}
                onClick={() => onChatClick(chat)}
              >
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${colors.dot} animate-pulse`} />
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}
                    >
                      {label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    #{chat.id.slice(0, 8)}
                  </div>
                </div>

                {/* Chat Info */}
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Real User</div>
                    <div className="text-sm font-medium text-gray-200">
                      {chat.real_user.name}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-400 mb-1">Fictional Profile</div>
                    <div className="text-sm font-medium text-gray-200">
                      {chat.fictional_user.name}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-400 mb-1">Operator</div>
                    <div className="text-sm font-medium text-gray-200">
                      {chat.operator?.name || 'Unassigned'}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Messages:</span>
                      <span className="text-gray-300 font-medium">
                        {chat.message_count}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Last Message:</span>
                      <span className="text-gray-300 font-medium">
                        {getResponseTime(chat)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Idle Duration:</span>
                      <span className={`font-medium ${colors.text}`}>
                        {getIdleDuration(chat)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* View Button */}
                <GlassButton className="w-full mt-4 text-sm py-2">
                  View Details
                </GlassButton>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
