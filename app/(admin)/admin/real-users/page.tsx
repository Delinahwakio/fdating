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
import { RealUser, ModerationAction } from '@/types/database'
import { RealUserCard, UserModerationModal } from '@/components/admin'

interface RealUserWithStats extends RealUser {
  total_chats?: number
  total_messages?: number
  last_active?: string
}

export default function RealUsersPage() {
  const [users, setUsers] = useState<RealUserWithStats[]>([])
  const [filteredUsers, setFilteredUsers] = useState<RealUserWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all')
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all')
  const [selectedUser, setSelectedUser] = useState<RealUserWithStats | null>(null)
  const [isModerationModalOpen, setIsModerationModalOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchUsers()

    // Set up real-time subscription for user changes
    const channel = supabase
      .channel('real-users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'real_users',
        },
        () => {
          fetchUsers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchQuery, statusFilter, genderFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)

      // Fetch all real users
      const { data: usersData, error: usersError } = await supabase
        .from('real_users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Fetch stats for each user
      const usersWithStats = await Promise.all(
        (usersData || []).map(async (user) => {
          // Get total chats
          const { count: totalChats } = await supabase
            .from('chats')
            .select('*', { count: 'exact', head: true })
            .eq('real_user_id', user.id)

          // Get total messages sent
          const { count: totalMessages } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_type', 'real')
            .in(
              'chat_id',
              (
                await supabase
                  .from('chats')
                  .select('id')
                  .eq('real_user_id', user.id)
              ).data?.map((c) => c.id) || []
            )

          // Get last active time from most recent message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('created_at')
            .eq('sender_type', 'real')
            .in(
              'chat_id',
              (
                await supabase
                  .from('chats')
                  .select('id')
                  .eq('real_user_id', user.id)
              ).data?.map((c) => c.id) || []
            )
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return {
            ...user,
            total_chats: totalChats || 0,
            total_messages: totalMessages || 0,
            last_active: lastMessage?.created_at || user.created_at,
          }
        })
      )

      setUsers(usersWithStats)
    } catch (error: any) {
      toast.error('Failed to load users: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = [...users]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.display_name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.location.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((user) => {
        if (statusFilter === 'active') return user.is_active
        if (statusFilter === 'blocked') return !user.is_active
        return true
      })
    }

    // Gender filter
    if (genderFilter !== 'all') {
      filtered = filtered.filter((user) => user.gender === genderFilter)
    }

    setFilteredUsers(filtered)
  }

  const handleUserClick = (user: RealUserWithStats) => {
    setSelectedUser(user)
    setIsModerationModalOpen(true)
  }

  const handleModerationSuccess = () => {
    setIsModerationModalOpen(false)
    setSelectedUser(null)
    fetchUsers()
  }

  const getStatusCounts = () => {
    const active = users.filter((u) => u.is_active).length
    const blocked = users.filter((u) => !u.is_active).length
    const male = users.filter((u) => u.gender === 'male').length
    const female = users.filter((u) => u.gender === 'female').length

    return { active, blocked, male, female }
  }

  const statusCounts = getStatusCounts()

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-50 mb-2">Real Users Management</h1>
          <p className="text-gray-400">
            View and moderate real user accounts on the platform
          </p>
        </div>

        {/* Filters */}
        <GlassCard className="p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <GlassInput
                type="text"
                placeholder="Search by name, email, or location..."
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
              <option value="blocked">Blocked</option>
            </select>

            {/* Gender Filter */}
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as any)}
              className="px-4 py-2 bg-glass-light border border-white/10 rounded-glass-sm text-gray-300 focus:outline-none focus:border-primary-red"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          {/* Stats */}
          <div className="mt-4 flex flex-wrap gap-6 text-sm">
            <div className="text-gray-400">
              Total: <span className="text-gray-200 font-medium">{users.length}</span>
            </div>
            <div className="text-gray-400">
              Active:{' '}
              <span className="text-green-400 font-medium">{statusCounts.active}</span>
            </div>
            <div className="text-gray-400">
              Blocked:{' '}
              <span className="text-red-400 font-medium">{statusCounts.blocked}</span>
            </div>
            <div className="text-gray-400">
              Male:{' '}
              <span className="text-blue-400 font-medium">{statusCounts.male}</span>
            </div>
            <div className="text-gray-400">
              Female:{' '}
              <span className="text-pink-400 font-medium">{statusCounts.female}</span>
            </div>
            <div className="text-gray-400">
              Showing: <span className="text-gray-200 font-medium">{filteredUsers.length}</span>
            </div>
          </div>
        </GlassCard>

        {/* Users Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner />
          </div>
        ) : filteredUsers.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <div className="text-gray-400">
              {searchQuery || statusFilter !== 'all' || genderFilter !== 'all'
                ? 'No users match your filters'
                : 'No users yet'}
            </div>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <RealUserCard
                key={user.id}
                user={user}
                onClick={() => handleUserClick(user)}
              />
            ))}
          </div>
        )}

        {/* Moderation Modal */}
        <Modal
          isOpen={isModerationModalOpen}
          onClose={() => setIsModerationModalOpen(false)}
        >
          {selectedUser && (
            <UserModerationModal
              user={selectedUser}
              onSuccess={handleModerationSuccess}
              onCancel={() => setIsModerationModalOpen(false)}
            />
          )}
        </Modal>
      </div>
    </AdminLayout>
  )
}
