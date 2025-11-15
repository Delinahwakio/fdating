'use client'

import { useState, useEffect } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'
import { GlassInput } from '@/components/shared/GlassInput'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { toast } from 'react-hot-toast'

interface ConfigValue {
  value: any
  description: string
  updated_at: string
  updated_by: string | null
}

interface PlatformConfig {
  idle_timeout_minutes: ConfigValue
  max_reassignments: ConfigValue
  free_message_count: ConfigValue
  credit_price_kes: ConfigValue
  maintenance_mode: ConfigValue
}

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<PlatformConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  // Form state
  const [idleTimeout, setIdleTimeout] = useState('')
  const [maxReassignments, setMaxReassignments] = useState('')
  const [freeMessageCount, setFreeMessageCount] = useState('')
  const [creditPrice, setCreditPrice] = useState('')
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/config')
      if (!response.ok) throw new Error('Failed to fetch configuration')
      
      const data = await response.json()
      setConfig(data.config)
      
      // Set form values
      setIdleTimeout(data.config.idle_timeout_minutes.value)
      setMaxReassignments(data.config.max_reassignments.value)
      setFreeMessageCount(data.config.free_message_count.value)
      setCreditPrice(data.config.credit_price_kes.value)
      setMaintenanceMode(data.config.maintenance_mode.value === 'true' || data.config.maintenance_mode.value === true)
    } catch (error) {
      console.error('Error fetching config:', error)
      toast.error('Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const updateConfig = async (key: string, value: any) => {
    setSaving(key)
    try {
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update configuration')
      }

      toast.success('Configuration updated successfully')
      await fetchConfig()
    } catch (error: any) {
      console.error('Error updating config:', error)
      toast.error(error.message || 'Failed to update configuration')
    } finally {
      setSaving(null)
    }
  }

  const handleIdleTimeoutSave = () => {
    const timeout = parseInt(idleTimeout)
    if (isNaN(timeout) || timeout < 1 || timeout > 30) {
      toast.error('Idle timeout must be between 1 and 30 minutes')
      return
    }
    updateConfig('idle_timeout_minutes', idleTimeout)
  }

  const handleMaxReassignmentsSave = () => {
    const max = parseInt(maxReassignments)
    if (isNaN(max) || max < 1 || max > 10) {
      toast.error('Max reassignments must be between 1 and 10')
      return
    }
    updateConfig('max_reassignments', maxReassignments)
  }

  const handleFreeMessageCountSave = () => {
    const count = parseInt(freeMessageCount)
    if (isNaN(count) || count < 0 || count > 10) {
      toast.error('Free message count must be between 0 and 10')
      return
    }
    updateConfig('free_message_count', freeMessageCount)
  }

  const handleCreditPriceSave = () => {
    const price = parseFloat(creditPrice)
    if (isNaN(price) || price < 1 || price > 1000) {
      toast.error('Credit price must be between 1 and 1000 KES')
      return
    }
    updateConfig('credit_price_kes', creditPrice)
  }

  const handleMaintenanceToggle = () => {
    const newValue = !maintenanceMode
    setMaintenanceMode(newValue)
    updateConfig('maintenance_mode', newValue)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-50 mb-8">Platform Settings</h1>

      {/* Operator Assignment Settings */}
      <GlassCard className="p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-50 mb-4">Operator Assignment</h2>
        
        <div className="space-y-6">
          {/* Idle Timeout */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Idle Timeout Duration (minutes)
            </label>
            <p className="text-sm text-gray-400 mb-3">
              {config?.idle_timeout_minutes.description}
            </p>
            <div className="flex gap-3">
              <GlassInput
                type="number"
                min="1"
                max="30"
                value={idleTimeout}
                onChange={(e) => setIdleTimeout(e.target.value)}
                className="flex-1"
                placeholder="5"
              />
              <GlassButton
                onClick={handleIdleTimeoutSave}
                disabled={saving === 'idle_timeout_minutes'}
                className="px-6"
              >
                {saving === 'idle_timeout_minutes' ? 'Saving...' : 'Save'}
              </GlassButton>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Valid range: 1-30 minutes
            </p>
          </div>

          {/* Max Reassignments */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Maximum Reassignments
            </label>
            <p className="text-sm text-gray-400 mb-3">
              {config?.max_reassignments.description}
            </p>
            <div className="flex gap-3">
              <GlassInput
                type="number"
                min="1"
                max="10"
                value={maxReassignments}
                onChange={(e) => setMaxReassignments(e.target.value)}
                className="flex-1"
                placeholder="3"
              />
              <GlassButton
                onClick={handleMaxReassignmentsSave}
                disabled={saving === 'max_reassignments'}
                className="px-6"
              >
                {saving === 'max_reassignments' ? 'Saving...' : 'Save'}
              </GlassButton>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Valid range: 1-10 reassignments
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Messaging Settings */}
      <GlassCard className="p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-50 mb-4">Messaging</h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Free Messages Per Chat
          </label>
          <p className="text-sm text-gray-400 mb-3">
            {config?.free_message_count.description}
          </p>
          <div className="flex gap-3">
            <GlassInput
              type="number"
              min="0"
              max="10"
              value={freeMessageCount}
              onChange={(e) => setFreeMessageCount(e.target.value)}
              className="flex-1"
              placeholder="3"
            />
            <GlassButton
              onClick={handleFreeMessageCountSave}
              disabled={saving === 'free_message_count'}
              className="px-6"
            >
              {saving === 'free_message_count' ? 'Saving...' : 'Save'}
            </GlassButton>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Valid range: 0-10 messages
          </p>
        </div>
      </GlassCard>

      {/* Credit Pricing */}
      <GlassCard className="p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-50 mb-4">Credit Pricing</h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Price Per Credit (KES)
          </label>
          <p className="text-sm text-gray-400 mb-3">
            {config?.credit_price_kes.description}
          </p>
          <div className="flex gap-3">
            <GlassInput
              type="number"
              min="1"
              max="1000"
              step="0.01"
              value={creditPrice}
              onChange={(e) => setCreditPrice(e.target.value)}
              className="flex-1"
              placeholder="10"
            />
            <GlassButton
              onClick={handleCreditPriceSave}
              disabled={saving === 'credit_price_kes'}
              className="px-6"
            >
              {saving === 'credit_price_kes' ? 'Saving...' : 'Save'}
            </GlassButton>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Valid range: 1-1000 KES
          </p>
        </div>
      </GlassCard>

      {/* Maintenance Mode */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold text-gray-50 mb-4">Maintenance Mode</h2>
        
        <div>
          <p className="text-sm text-gray-400 mb-4">
            {config?.maintenance_mode.description}
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 font-medium">
                {maintenanceMode ? 'Maintenance Mode Active' : 'Platform Operational'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {maintenanceMode 
                  ? 'Non-admin users will see a maintenance page'
                  : 'All users can access the platform normally'
                }
              </p>
            </div>
            <button
              onClick={handleMaintenanceToggle}
              disabled={saving === 'maintenance_mode'}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                maintenanceMode ? 'bg-red-600' : 'bg-gray-600'
              } ${saving === 'maintenance_mode' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  maintenanceMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Last Updated Info */}
      {config && (
        <div className="mt-6 text-center text-sm text-gray-500">
          Last updated: {new Date(config.idle_timeout_minutes.updated_at).toLocaleString()}
        </div>
      )}
    </div>
  )
}
