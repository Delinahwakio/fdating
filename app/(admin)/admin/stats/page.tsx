'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { GlassCard } from '@/components/shared/GlassCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

// Code splitting: Dynamically import heavy analytics components
const PlatformStats = dynamic(
  () => import('@/components/admin/PlatformStats').then(mod => ({ default: mod.PlatformStats })),
  {
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <GlassCard key={i} className="p-6">
            <div className="flex items-center justify-center h-24">
              <LoadingSpinner />
            </div>
          </GlassCard>
        ))}
      </div>
    ),
    ssr: false
  }
)

const OperatorPerformanceTable = dynamic(
  () => import('@/components/admin/OperatorPerformanceTable').then(mod => ({ default: mod.OperatorPerformanceTable })),
  {
    loading: () => (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </GlassCard>
    ),
    ssr: false
  }
)

const AnalyticsCharts = dynamic(
  () => import('@/components/admin/AnalyticsCharts').then(mod => ({ default: mod.AnalyticsCharts })),
  {
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3].map(i => (
          <GlassCard key={i} className="p-6">
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          </GlassCard>
        ))}
      </div>
    ),
    ssr: false
  }
)

type DateRange = 'today' | 'week' | 'month' | 'year' | 'all'

export default function AdminStatsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('month')

  return (
    <div className="min-h-screen p-8 bg-[#0F0F23]">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-50 mb-2">
              Platform Analytics
            </h1>
            <p className="text-gray-400">
              Comprehensive insights into platform performance and metrics
            </p>
          </div>

          {/* Date Range Filter */}
          <GlassCard className="p-2">
            <div className="flex gap-2">
              {[
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
                { value: 'year', label: 'Year' },
                { value: 'all', label: 'All Time' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDateRange(option.value as DateRange)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    dateRange === option.value
                      ? 'bg-primary-red text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Platform Statistics */}
        <section>
          <PlatformStats dateRange={dateRange} />
        </section>

        {/* Analytics Charts */}
        <section>
          <h2 className="text-2xl font-bold text-gray-50 mb-6">Trends & Analytics</h2>
          <AnalyticsCharts dateRange={dateRange} />
        </section>

        {/* Operator Performance */}
        <section>
          <h2 className="text-2xl font-bold text-gray-50 mb-6">
            Operator Performance Rankings
          </h2>
          <OperatorPerformanceTable dateRange={dateRange} />
        </section>
      </div>
    </div>
  )
}
