'use client'

import { useState, useEffect } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'
import { GlassInput } from '@/components/shared/GlassInput'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { Operator } from '@/types/database'

interface ReassignChatModalProps {
  chatId: string
  currentOperatorId: string | null
  onSuccess: () => void
  onCancel: () => void
}

export const ReassignChatModal = ({
  chatId,
  currentOperatorId,
  onSuccess,
  onCancel,
}: ReassignChatModalProps) => {
  const [operators, setOperators] = useState<Operator[]>([])
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchOperators()
  }, [])

  const fetchOperators = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('operators')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error

      setOperators(data || [])

      // Pre-select first available operator (excluding current)
      const availableOps = (data || []).filter(
        (op) => op.id !== currentOperatorId
      )
      if (availableOps.length > 0) {
        setSelectedOperatorId(availableOps[0].id)
      }
    } catch (error: any) {
      toast.error('Failed to load operators: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedOperatorId) {
      toast.error('Please select an operator')
      return
    }

    if (selectedOperatorId === currentOperatorId) {
      toast.error('Please select a different operator')
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch(`/api/admin/chats/${chatId}/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operatorId: selectedOperatorId,
          reason: reason.trim() || 'Manual reassignment by admin',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reassign chat')
      }

      const result = await response.json()

      toast.success(
        `Chat reassigned from ${result.previousOperator} to ${result.newOperator}`
      )
      onSuccess()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const getOperatorStatus = (operator: Operator) => {
    if (operator.id === currentOperatorId) {
      return { label: 'Current', color: 'text-blue-400' }
    }
    if (operator.is_available) {
      return { label: 'Available', color: 'text-green-400' }
    }

    // Check if recently active
    const lastActivity = new Date(operator.last_activity)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const isRecentlyActive = lastActivity > fiveMinutesAgo

    if (isRecentlyActive) {
      return { label: 'Busy', color: 'text-yellow-400' }
    }

    return { label: 'Offline', color: 'text-gray-400' }
  }

  return (
    <GlassCard className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-50 mb-6">Reassign Chat</h2>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      ) : operators.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No active operators available</p>
          <GlassButton onClick={onCancel}>Close</GlassButton>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Operator Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Select Operator
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {operators.map((operator) => {
                const status = getOperatorStatus(operator)
                const isCurrent = operator.id === currentOperatorId
                const isDisabled = isCurrent

                return (
                  <label
                    key={operator.id}
                    className={`flex items-center gap-3 p-4 rounded-glass-sm border transition-all cursor-pointer ${
                      selectedOperatorId === operator.id
                        ? 'bg-primary-red/20 border-primary-red/50'
                        : 'bg-glass-light border-white/10 hover:border-white/20'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      name="operator"
                      value={operator.id}
                      checked={selectedOperatorId === operator.id}
                      onChange={(e) => setSelectedOperatorId(e.target.value)}
                      disabled={isDisabled}
                      className="w-4 h-4 text-primary-red focus:ring-primary-red"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-200">
                          {operator.name}
                        </span>
                        <span className={`text-xs ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">{operator.email}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {operator.total_messages} messages sent
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Reason */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason (Optional)
            </label>
            <GlassInput
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Workload balancing, operator request..."
              className="w-full"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <GlassButton
              type="button"
              onClick={onCancel}
              variant="secondary"
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              className="flex-1"
              disabled={submitting || !selectedOperatorId}
            >
              {submitting ? 'Reassigning...' : 'Reassign Chat'}
            </GlassButton>
          </div>
        </form>
      )}
    </GlassCard>
  )
}
