'use client'

import { GlassCard } from '@/components/shared/GlassCard'
import { GlassInput } from '@/components/shared/GlassInput'
import { useState } from 'react'

interface ProfileFiltersProps {
  onFilterChange: (filters: FilterState) => void
}

export interface FilterState {
  minAge: number
  maxAge: number
  location: string
}

export const ProfileFilters = ({ onFilterChange }: ProfileFiltersProps) => {
  const [minAge, setMinAge] = useState(18)
  const [maxAge, setMaxAge] = useState(100)
  const [location, setLocation] = useState('')

  const handleApplyFilters = () => {
    onFilterChange({ minAge, maxAge, location })
  }

  return (
    <GlassCard className="p-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-50 mb-4">Filters</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Min Age</label>
          <GlassInput
            type="number"
            value={minAge}
            onChange={(e) => setMinAge(Number(e.target.value))}
            min={18}
            max={100}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Max Age</label>
          <GlassInput
            type="number"
            value={maxAge}
            onChange={(e) => setMaxAge(Number(e.target.value))}
            min={18}
            max={100}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Location</label>
          <GlassInput
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter location..."
          />
        </div>
      </div>
      <button
        onClick={handleApplyFilters}
        className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
      >
        Apply Filters
      </button>
    </GlassCard>
  )
}
