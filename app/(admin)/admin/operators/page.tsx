'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'
import { GlassInput } from '@/components/shared/GlassInput'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Modal } from '@/components/shared/Modal'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { Operator } from '@/types/database'
import { OperatorCard } from '@/components/admin/OperatorCard'
import { OperatorForm } from '@/components/admin/OperatorForm'

interface OperatorWithStats extends Operator {
  total_chats?: number
  avg_response_time?: number
}

export default function OperatorsPage() {
  const [operators, setOperators] = useState<OperatorWithStats[]>([])
  const [filteredOperators, setFilteredOperators] = useState<OperatorWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'available' | 'offline'>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchOperators()
    
    // Set up real-time subscription for operator status changes
    const channel = supabase
      .channel('operators-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operators',
        },
        () => {
          fetchOperators()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    filterOperators()
  }, [operators, searchQuery, statusFilter])

  const fetchOperators = async () => {
    try {
      setLoading(true)
      
      // Fetch operators with their stats
      const { data: operatorsData, error: operatorsError } = await supabase
        .from('operators')
        .select('*')
        .order('created_at', { ascending: false })

      if (operatorsError) throw operatorsError

      // Fetch stats for each operator
      const operatorsWithStats = await Promise.all(
        (operatorsData || []).map(async (operator) => {
          // Get total chats handled
          const { count: totalChats } = await supabase
            .from('chat_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('operator_id', operator.id)

          return {
            ...operator,
            total_chats: totalChats || 0,
          }
        })
      )

      setOperators(operatorsWithStats)
    } catch (error: any) {
      toast.error('Failed to load operators: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filterOperators = () => {
    let filtered = [...operators]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (operator) =>
          operator.name.toLowerCase().includes(query) ||
          operator.email.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((operator) => {
        if (statusFilter === 'active') return operator.is_active
        if (statusFilter === 'inactive') return !operator.is_active
        if (statusFilter === 'available') return operator.is_active && operator.is_available
        if (statusFilter === 'offline') {
          const lastActivity = new Date(operator.last_activity)
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
          return operator.is_active && !operator.is_available && lastActivity < fiveMinutesAgo
        }
        return true
      })
    }

    setFilteredOperators(filtered)
  }

  const handleToggleActive = async (operatorId: string, isActive: boolean) => {
    const action = isActive ? 'activate' : 'deactivate'
    if (!confirm(`Are you sure you want to ${action} this operator?`)) return

    try {
      const { error } = await supabase
        .from('operators')
        .update({ is_active: isActive })
        .eq('id', operatorId)

      if (error) throw error

      toast.success(`Operator ${action}d successfully`)
      fetchOperators()
    } catch (error: any) {
      toast.error(`Failed to ${action} operator: ` + error.message)
    }
  }

  const getStatusCounts = () => {
    const active = operators.filter((o) => o.is_active).length
    const available = operators.filter((o) => o.is_active && o.is_available).length
    const busy = operators.filter((o) => {
      if (!o.is_active || o.is_available) return false
      const lastActivity = new Date(o.last_activity)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      return lastActivity > fiveMinutesAgo
    }).length
    const offline = operators.filter((o) => {
      if (!o.is_active) return false
      const lastActivity = new Date(o.last_activity)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      return !o.is_available && lastActivity < fiveMinutesAgo
    }).length

    return { active, available, busy, offline }
  }

  const statusCounts = getStatusCounts()

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-50 mb-2">Operator Management</h1>
          <p className="text-gray-400">Manage operator accounts and monitor their performance</p>
        </div>

        {/* Filters and Actions */}
        <GlassCard className="p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <GlassInput
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 bg-glass-light border border-white/10 rounded-glass-sm text-gray-300 focus:outline-none focus:border-primary-red"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="available">Available</option>
              <option value="offline">Offline</option>
            </select>

            {/* Create Button */}
            <GlassButton onClick={() => setIsCreateModalOpen(true)} className="whitespace-nowrap">
              + Create Operator
            </GlassButton>
          </div>

          {/* Stats */}
          <div className="mt-4 flex flex-wrap gap-6 text-sm">
            <div className="text-gray-400">
              Total: <span className="text-gray-200 font-medium">{operators.length}</span>
            </div>
            <div className="text-gray-400">
              Active:{' '}
              <span className="text-green-400 font-medium">{statusCounts.active}</span>
            </div>
            <div className="text-gray-400">
              Available:{' '}
              <span className="text-green-400 font-medium">{statusCounts.available}</span>
            </div>
            <div className="text-gray-400">
              Busy:{' '}
              <span className="text-yellow-400 font-medium">{statusCounts.busy}</span>
            </div>
            <div className="text-gray-400">
              Offline:{' '}
              <span className="text-red-400 font-medium">{statusCounts.offline}</span>
            </div>
            <div className="text-gray-400">
              Showing: <span className="text-gray-200 font-medium">{filteredOperators.length}</span>
            </div>
          </div>
        </GlassCard>

        {/* Operators Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner />
          </div>
        ) : filteredOperators.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'No operators match your filters'
                : 'No operators yet'}
            </div>
            {!searchQuery && statusFilter === 'all' && (
              <GlassButton onClick={() => setIsCreateModalOpen(true)}>
                Create First Operator
              </GlassButton>
            )}
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOperators.map((operator) => (
              <OperatorCard
                key={operator.id}
                operator={operator}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        )}

        {/* Create Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        >
          <OperatorForm
            onSuccess={() => {
              setIsCreateModalOpen(false)
              fetchOperators()
            }}
            onCancel={() => setIsCreateModalOpen(false)}
          />
        </Modal>
      </div>
    </AdminLayout>
  )
}
