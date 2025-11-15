'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/shared/GlassCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { OperatorStatsDisplay, OperatorStatsChart } from '@/components/operator'
import type { OperatorStats } from '@/types/database'

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

export default function OperatorStatsPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!user?.id) return

    try {
      if (loading) {
        setError(null)
      }

      const supabase = createClient()

      // Call the database function to get comprehensive stats
      const { data, error: statsError } = await supabase
        .rpc('get_operator_performance_stats', {
          p_operator_id: user.id,
          p_days: 30
        })

      if (statsError) throw statsError

      if (data && data.length > 0) {
        setStats(data[0])
      } else {
        // No stats yet, set defaults
        setStats({
          total_messages: 0,
          total_chats: 0,
          avg_response_time_seconds: 0,
          idle_incidents: 0,
          daily_stats: []
        })
      }
    } catch (err) {
      console.error('Error fetching operator stats:', err)
      setError('Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }, [user?.id, loading])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()

    // Subscribe to operator_stats changes for this operator
    const statsChannel = supabase
      .channel(`operator-stats:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operator_stats',
          filter: `operator_id=eq.${user.id}`
        },
        () => {
          // Refetch stats when operator_stats table changes
          fetchStats()
        }
      )
      .subscribe()

    // Subscribe to messages table to update stats when operator sends messages
    const messagesChannel = supabase
      .channel(`operator-messages:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `handled_by_operator_id=eq.${user.id}`
        },
        () => {
          // Refetch stats when operator sends a new message
          fetchStats()
        }
      )
      .subscribe()

    // Subscribe to chat_assignments for idle incidents
    const assignmentsChannel = supabase
      .channel(`operator-assignments:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_assignments',
          filter: `operator_id=eq.${user.id}`
        },
        () => {
          // Refetch stats when assignments change (including idle releases)
          fetchStats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(statsChannel)
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(assignmentsChannel)
    }
  }, [user?.id, fetchStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <GlassCard className="p-8 max-w-md">
          <p className="text-red-500 text-center">{error}</p>
        </GlassCard>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <GlassCard className="p-8 max-w-md">
          <p className="text-gray-300 text-center">No statistics available</p>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-50 mb-2">Your Statistics</h1>
          <p className="text-gray-400">Track your performance and activity</p>
        </div>

        {/* Stats Overview */}
        <OperatorStatsDisplay stats={stats} />

        {/* Daily Activity Chart */}
        <OperatorStatsChart dailyStats={stats.daily_stats || []} />
      </div>
    </div>
  )
}
