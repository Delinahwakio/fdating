'use client'

import { useState, useEffect } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface OperatorPerformance {
  id: string
  name: string
  email: string
  totalMessages: number
  chatsHandled: number
  averageResponseTime: number
  isAvailable: boolean
  lastActivity: string
}

type SortField = 'name' | 'totalMessages' | 'chatsHandled' | 'averageResponseTime'
type SortDirection = 'asc' | 'desc'

interface OperatorPerformanceTableProps {
  dateRange: 'today' | 'week' | 'month' | 'year' | 'all'
}

export const OperatorPerformanceTable = ({ dateRange }: OperatorPerformanceTableProps) => {
  const [operators, setOperators] = useState<OperatorPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('totalMessages')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    fetchOperatorPerformance()
  }, [dateRange])

  const fetchOperatorPerformance = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/admin/operators/performance?dateRange=${dateRange}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch operator performance')
      }

      const data = await response.json()
      setOperators(data.operators)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new field with descending as default
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedOperators = [...operators].sort((a, b) => {
    let aValue: number | string = 0
    let bValue: number | string = 0

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'totalMessages':
        aValue = a.totalMessages
        bValue = b.totalMessages
        break
      case 'chatsHandled':
        aValue = a.chatsHandled
        bValue = b.chatsHandled
        break
      case 'averageResponseTime':
        aValue = a.averageResponseTime
        bValue = b.averageResponseTime
        break
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const formatResponseTime = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatLastActivity = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      )
    }

    return sortDirection === 'asc' ? (
      <svg
        className="w-4 h-4 text-primary-red"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 text-primary-red"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    )
  }

  if (loading) {
    return (
      <GlassCard className="p-12 flex items-center justify-center">
        <LoadingSpinner />
      </GlassCard>
    )
  }

  if (error) {
    return (
      <GlassCard className="p-8">
        <div className="text-red-400 text-center">
          <p className="font-medium mb-2">Error loading operator performance</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </GlassCard>
    )
  }

  if (operators.length === 0) {
    return (
      <GlassCard className="p-8">
        <div className="text-gray-400 text-center">
          <p>No operator data available</p>
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-6">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Rank
              </th>
              <th
                className="text-left py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-gray-200 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  Operator
                  <SortIcon field="name" />
                </div>
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">
                Status
              </th>
              <th
                className="text-right py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-gray-200 transition-colors"
                onClick={() => handleSort('totalMessages')}
              >
                <div className="flex items-center justify-end gap-2">
                  Messages Sent
                  <SortIcon field="totalMessages" />
                </div>
              </th>
              <th
                className="text-right py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-gray-200 transition-colors"
                onClick={() => handleSort('chatsHandled')}
              >
                <div className="flex items-center justify-end gap-2">
                  Chats Handled
                  <SortIcon field="chatsHandled" />
                </div>
              </th>
              <th
                className="text-right py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-gray-200 transition-colors"
                onClick={() => handleSort('averageResponseTime')}
              >
                <div className="flex items-center justify-end gap-2">
                  Avg Response Time
                  <SortIcon field="averageResponseTime" />
                </div>
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                Last Activity
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedOperators.map((operator, index) => {
              // Determine rank based on current sort
              const rank = index + 1
              const isTopPerformer = rank <= 3

              return (
                <tr
                  key={operator.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {isTopPerformer && (
                        <span className="text-lg">
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                        </span>
                      )}
                      <span className="text-sm text-gray-400 font-medium">
                        #{rank}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <div className="text-sm font-medium text-gray-200">
                        {operator.name}
                      </div>
                      <div className="text-xs text-gray-500">{operator.email}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {operator.isAvailable ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Offline
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-medium text-gray-300">
                      {operator.totalMessages.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-medium text-gray-300">
                      {operator.chatsHandled.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-medium text-gray-300">
                      {formatResponseTime(operator.averageResponseTime)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-xs text-gray-400">
                      {formatLastActivity(operator.lastActivity)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-1">Total Messages</p>
          <p className="text-2xl font-bold text-gray-200">
            {sortedOperators
              .reduce((sum, op) => sum + op.totalMessages, 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-1">Total Chats Handled</p>
          <p className="text-2xl font-bold text-gray-200">
            {sortedOperators
              .reduce((sum, op) => sum + op.chatsHandled, 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-1">Avg Response Time</p>
          <p className="text-2xl font-bold text-gray-200">
            {formatResponseTime(
              sortedOperators.reduce((sum, op) => sum + op.averageResponseTime, 0) /
                sortedOperators.length
            )}
          </p>
        </div>
      </div>
    </GlassCard>
  )
}
