'use client'

import { useState, useEffect } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface ChartData {
  userGrowth: Array<{ date: string; users: number; cumulative: number }>
  messageVolume: Array<{ date: string; messages: number }>
  revenueTrends: Array<{ date: string; revenue: number; transactions: number }>
}

interface AnalyticsChartsProps {
  dateRange: 'today' | 'week' | 'month' | 'year' | 'all'
}

export const AnalyticsCharts = ({ dateRange }: AnalyticsChartsProps) => {
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchChartData()
  }, [dateRange])

  const fetchChartData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/analytics?dateRange=${dateRange}`)

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      const data = await response.json()
      setChartData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const CustomTooltip = ({ active, payload, label, type }: any) => {
    if (!active || !payload || !payload.length) {
      return null
    }

    return (
      <div className="bg-[#1A1A2E] border border-white/20 rounded-lg p-3 shadow-xl backdrop-blur-sm">
        <p className="text-gray-300 text-sm font-medium mb-2">
          {formatDate(label)}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-400">{entry.name}:</span>
            <span className="text-gray-200 font-medium">
              {type === 'currency'
                ? formatCurrency(entry.value)
                : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
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
          <p className="font-medium mb-2">Error loading analytics</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </GlassCard>
    )
  }

  if (!chartData) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* User Growth Chart */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-6">User Growth Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData.userGrowth}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip type="number" />} />
            <Legend
              wrapperStyle={{ fontSize: '14px', color: '#9CA3AF' }}
              iconType="circle"
            />
            <Line
              type="monotone"
              dataKey="users"
              stroke="#3B82F6"
              strokeWidth={2}
              name="New Users"
              dot={{ fill: '#3B82F6', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#DC2626"
              strokeWidth={2}
              name="Total Users"
              dot={{ fill: '#DC2626', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Message Volume Chart */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-6">Message Volume by Date</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData.messageVolume}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip type="number" />} />
            <Legend
              wrapperStyle={{ fontSize: '14px', color: '#9CA3AF' }}
              iconType="circle"
            />
            <Bar
              dataKey="messages"
              fill="#8B5CF6"
              name="Messages"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Revenue Trends Chart */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-6">Revenue Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData.revenueTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              yAxisId="left"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<CustomTooltip type="currency" />} />
            <Legend
              wrapperStyle={{ fontSize: '14px', color: '#9CA3AF' }}
              iconType="circle"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              stroke="#10B981"
              strokeWidth={2}
              name="Revenue (KES)"
              dot={{ fill: '#10B981', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="transactions"
              stroke="#F59E0B"
              strokeWidth={2}
              name="Transactions"
              dot={{ fill: '#F59E0B', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  )
}
