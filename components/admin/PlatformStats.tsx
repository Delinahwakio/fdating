'use client'

import { useState, useEffect } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface PlatformStatsData {
  totalRealUsers: number
  totalFictionalProfiles: number
  totalOperators: number
  activeChats: number
  totalTransactions: number
  totalCreditsPurchased: number
  totalRevenue: number
  revenueByDate: Array<{ date: string; revenue: number; transactions: number }>
}

interface PlatformStatsProps {
  dateRange: 'today' | 'week' | 'month' | 'year' | 'all'
}

export const PlatformStats = ({ dateRange }: PlatformStatsProps) => {
  const [stats, setStats] = useState<PlatformStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [dateRange])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/stats?dateRange=${dateRange}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch statistics')
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
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
          <p className="font-medium mb-2">Error loading statistics</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </GlassCard>
    )
  }

  if (!stats) {
    return null
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  return (
    <div className="space-y-6">
      {/* Platform Overview */}
      <div>
        <h3 className="text-lg font-semibold text-gray-200 mb-4">Platform Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Real Users</p>
                <p className="text-3xl font-bold text-gray-50">
                  {formatNumber(stats.totalRealUsers)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Fictional Profiles</p>
                <p className="text-3xl font-bold text-gray-50">
                  {formatNumber(stats.totalFictionalProfiles)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Operators</p>
                <p className="text-3xl font-bold text-gray-50">
                  {formatNumber(stats.totalOperators)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Active Chats</p>
                <p className="text-3xl font-bold text-gray-50">
                  {formatNumber(stats.activeChats)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-200 mb-4">
          Revenue Metrics
          {dateRange !== 'all' && (
            <span className="text-sm font-normal text-gray-400 ml-2">
              ({dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'This Week' : dateRange === 'month' ? 'This Month' : 'This Year'})
            </span>
          )}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-primary-red">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary-red/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-primary-red"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Transactions</p>
                <p className="text-3xl font-bold text-gray-50">
                  {formatNumber(stats.totalTransactions)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Credits Purchased</p>
                <p className="text-3xl font-bold text-gray-50">
                  {formatNumber(stats.totalCreditsPurchased)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-pink-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Revenue by Date Table */}
      {stats.revenueByDate.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Revenue by Date</h3>
          <GlassCard className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                      Date
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                      Transactions
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.revenueByDate.map((item, index) => (
                    <tr
                      key={index}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-gray-300">
                        {new Date(item.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-300 text-right">
                        {formatNumber(item.transactions)}
                      </td>
                      <td className="py-3 px-4 text-sm text-primary-red font-medium text-right">
                        {formatCurrency(item.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
