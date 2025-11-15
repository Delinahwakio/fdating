'use client'

import { FC, useState, useEffect } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'
import { GlassInput } from '@/components/shared/GlassInput'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { RealUser, ModerationAction, Admin } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'

interface RealUserWithStats extends RealUser {
  total_chats?: number
  total_messages?: number
  last_active?: string
}

interface UserModerationModalProps {
  user: RealUserWithStats
  onSuccess: () => void
  onCancel: () => void
}

export const UserModerationModal: FC<UserModerationModalProps> = ({
  user,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false)
  const [moderationHistory, setModerationHistory] = useState<
    (ModerationAction & { admin: Admin })[]
  >([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [actionType, setActionType] = useState<'block' | 'unblock' | 'warning'>('block')

  const supabase = createClient()

  useEffect(() => {
    fetchModerationHistory()
  }, [user.id])

  const fetchModerationHistory = async () => {
    try {
      setHistoryLoading(true)

      const { data, error } = await supabase
        .from('moderation_actions')
        .select(
          `
          *,
          admin:admins(*)
        `
        )
        .eq('real_user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setModerationHistory((data as any) || [])
    } catch (error: any) {
      console.error('Failed to load moderation history:', error.message)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleBlockUser = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for blocking this user')
      return
    }

    if (!confirm('Are you sure you want to block this user? All active chats will be terminated.')) {
      return
    }

    try {
      setLoading(true)

      // Get current admin
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) throw new Error('Not authenticated')

      // Block user
      const { error: userError } = await supabase
        .from('real_users')
        .update({ is_active: false })
        .eq('id', user.id)

      if (userError) throw userError

      // Terminate all active chats
      const { error: chatsError } = await supabase
        .from('chats')
        .update({
          is_active: false,
          assigned_operator_id: null,
          assignment_time: null,
        })
        .eq('real_user_id', user.id)
        .eq('is_active', true)

      if (chatsError) throw chatsError

      // Log moderation action
      const { error: logError } = await supabase.from('moderation_actions').insert({
        real_user_id: user.id,
        admin_id: authUser.id,
        action_type: 'block',
        reason: reason.trim(),
        notes: notes.trim() || null,
      })

      if (logError) throw logError

      toast.success('User blocked successfully')
      onSuccess()
    } catch (error: any) {
      toast.error('Failed to block user: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUnblockUser = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for unblocking this user')
      return
    }

    if (!confirm('Are you sure you want to unblock this user?')) {
      return
    }

    try {
      setLoading(true)

      // Get current admin
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) throw new Error('Not authenticated')

      // Unblock user
      const { error: userError } = await supabase
        .from('real_users')
        .update({ is_active: true })
        .eq('id', user.id)

      if (userError) throw userError

      // Log moderation action
      const { error: logError } = await supabase.from('moderation_actions').insert({
        real_user_id: user.id,
        admin_id: authUser.id,
        action_type: 'unblock',
        reason: reason.trim(),
        notes: notes.trim() || null,
      })

      if (logError) throw logError

      toast.success('User unblocked successfully')
      onSuccess()
    } catch (error: any) {
      toast.error('Failed to unblock user: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleWarning = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the warning')
      return
    }

    try {
      setLoading(true)

      // Get current admin
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) throw new Error('Not authenticated')

      // Log warning action
      const { error: logError } = await supabase.from('moderation_actions').insert({
        real_user_id: user.id,
        admin_id: authUser.id,
        action_type: 'warning',
        reason: reason.trim(),
        notes: notes.trim() || null,
      })

      if (logError) throw logError

      toast.success('Warning logged successfully')
      setReason('')
      setNotes('')
      fetchModerationHistory()
    } catch (error: any) {
      toast.error('Failed to log warning: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (user.is_active) {
      if (actionType === 'block') {
        await handleBlockUser()
      } else if (actionType === 'warning') {
        await handleWarning()
      }
    } else {
      await handleUnblockUser()
    }
  }

  const getActionTypeColor = (type: string) => {
    switch (type) {
      case 'block':
        return 'text-red-400'
      case 'unblock':
        return 'text-green-400'
      case 'warning':
        return 'text-yellow-400'
      case 'suspend':
        return 'text-orange-400'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <GlassCard className="p-6 max-w-3xl max-h-[90vh] overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-50 mb-6">User Moderation</h2>

      {/* User Info */}
      <div className="mb-6 p-4 bg-glass-light rounded-glass-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-50">{user.display_name}</h3>
            <p className="text-sm text-gray-400">@{user.name}</p>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              user.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {user.is_active ? 'Active' : 'Blocked'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Email:</span>
            <p className="text-gray-200">{user.email}</p>
          </div>
          <div>
            <span className="text-gray-400">Location:</span>
            <p className="text-gray-200">{user.location}</p>
          </div>
          <div>
            <span className="text-gray-400">Credits:</span>
            <p className="text-gray-200">{user.credits}</p>
          </div>
          <div>
            <span className="text-gray-400">Total Chats:</span>
            <p className="text-gray-200">{user.total_chats || 0}</p>
          </div>
        </div>
      </div>

      {/* Moderation Action Form */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-50 mb-4">Take Action</h3>

        {user.is_active && (
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Action Type</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as any)}
              className="w-full px-4 py-2 bg-glass-light border border-white/10 rounded-glass-sm text-gray-300 focus:outline-none focus:border-primary-red"
            >
              <option value="warning">Issue Warning</option>
              <option value="block">Block User</option>
            </select>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">
            Reason <span className="text-red-400">*</span>
          </label>
          <GlassInput
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for this action..."
            className="w-full"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Additional Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes..."
            rows={3}
            className="w-full px-4 py-2 bg-glass-light border border-white/10 rounded-glass-sm text-gray-300 focus:outline-none focus:border-primary-red resize-none"
          />
        </div>

        <div className="flex gap-3">
          <GlassButton
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            className="flex-1"
          >
            {loading ? (
              <LoadingSpinner />
            ) : user.is_active ? (
              actionType === 'block' ? (
                'Block User'
              ) : (
                'Issue Warning'
              )
            ) : (
              'Unblock User'
            )}
          </GlassButton>
          <GlassButton onClick={onCancel} variant="secondary" disabled={loading}>
            Cancel
          </GlassButton>
        </div>
      </div>

      {/* Moderation History */}
      <div>
        <h3 className="text-lg font-semibold text-gray-50 mb-4">Moderation History</h3>

        {historyLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : moderationHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No moderation history</div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {moderationHistory.map((action) => (
              <div key={action.id} className="p-4 bg-glass-light rounded-glass-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className={`font-medium capitalize ${getActionTypeColor(action.action_type)}`}>
                      {action.action_type}
                    </span>
                    <p className="text-sm text-gray-400 mt-1">
                      by {action.admin.name} •{' '}
                      {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="text-sm">
                  <p className="text-gray-300 mb-1">
                    <span className="text-gray-400">Reason:</span> {action.reason}
                  </p>
                  {action.notes && (
                    <p className="text-gray-300">
                      <span className="text-gray-400">Notes:</span> {action.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  )
}
