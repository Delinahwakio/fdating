'use client'

import { useMemo } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'

interface DailyStat {
  date: string
  messages_sent: number
  chats_handled: number
}

interface OperatorStatsChartProps {
  dailyStats: DailyStat[]
}

export const OperatorStatsChart = ({ dailyStats }: OperatorStatsChartProps) => {
  // Sort stats by date ascending and ensure we have 30 days
  const chartData = useMemo(() => {
    const sortedStats = [...dailyStats].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Fill in missing days with zero values
    const filledData: DailyStat[] = []
    const today = new Date()
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const existingStat = sortedStats.find(s => s.date === dateStr)
      filledData.push(existingStat || {
        date: dateStr,
        messages_sent: 0,
        chats_handled: 0
      })
    }

    return filledData
  }, [dailyStats])

  // Calculate max value for scaling
  const maxMessages = useMemo(() => {
    const max = Math.max(...chartData.map(d => d.messages_sent), 1)
    return Math.ceil(max / 10) * 10 // Round up to nearest 10
  }, [chartData])

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Get day of week
  const getDayOfWeek = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  return (
    <GlassCard className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-50 mb-1">Daily Message Activity</h2>
        <p className="text-sm text-gray-400">Messages sent over the past 30 days</p>
      </div>

      {/* Chart */}
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-500 pr-2">
          <span>{maxMessages}</span>
          <span>{Math.floor(maxMessages * 0.75)}</span>
          <span>{Math.floor(maxMessages * 0.5)}</span>
          <span>{Math.floor(maxMessages * 0.25)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="ml-8">
          <div className="flex items-end justify-between gap-1 h-64 border-b border-l border-white/10 pb-2 pl-2">
            {chartData.map((stat, index) => {
              const height = maxMessages > 0 
                ? (stat.messages_sent / maxMessages) * 100 
                : 0

              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center group relative"
                >
                  {/* Bar */}
                  <div
                    className="w-full bg-gradient-to-t from-primary-red to-red-400 rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer"
                    style={{ height: `${height}%`, minHeight: height > 0 ? '2px' : '0' }}
                  />

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                    <div className="bg-secondary-bg border border-white/20 rounded-glass-sm px-3 py-2 text-xs whitespace-nowrap shadow-lg">
                      <div className="font-semibold text-gray-50 mb-1">
                        {formatDate(stat.date)}
                      </div>
                      <div className="text-gray-300">
                        Messages: <span className="text-primary-red font-medium">{stat.messages_sent}</span>
                      </div>
                      <div className="text-gray-300">
                        Chats: <span className="text-blue-400 font-medium">{stat.chats_handled}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* X-axis labels - show every 5th day */}
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            {chartData.map((stat, index) => {
              if (index % 5 === 0 || index === chartData.length - 1) {
                return (
                  <div key={index} className="flex-1 text-center">
                    <div>{formatDate(stat.date)}</div>
                  </div>
                )
              }
              return <div key={index} className="flex-1" />
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-t from-primary-red to-red-400 rounded-sm" />
          <span className="text-gray-300">Messages Sent</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-blue-400">
            {chartData.reduce((sum, stat) => sum + stat.messages_sent, 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">Total Messages (30d)</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-400">
            {chartData.reduce((sum, stat) => sum + stat.chats_handled, 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">Total Chats (30d)</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-yellow-400">
            {chartData.length > 0 
              ? Math.round(chartData.reduce((sum, stat) => sum + stat.messages_sent, 0) / chartData.length)
              : 0}
          </div>
          <div className="text-xs text-gray-400 mt-1">Avg Messages/Day</div>
        </div>
      </div>
    </GlassCard>
  )
}
