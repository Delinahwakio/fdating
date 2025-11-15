'use client'

import { useState, useEffect } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'
import { GlassInput } from '@/components/shared/GlassInput'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { Chat, Message, Operator, RealUser, FictionalUser } from '@/types/database'

interface ChatWithDetails extends Chat {
  real_user: RealUser
  fictional_user: FictionalUser
  operator?: Operator | null
}

interface AdminChatDetailProps {
  chat: ChatWithDetails
  onReassign: (chatId: string) => void
  onForceClose: (chatId: string) => void
  onBlockUser: (userId: string) => void
}

export const AdminChatDetail = ({
  chat,
  onReassign,
  onForceClose,
  onBlockUser,
}: AdminChatDetailProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel(`admin-chat:${chat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chat.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chat.id}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id ? (payload.new as Message) : msg
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chat.id])

  const fetchMessages = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      setMessages(data || [])
    } catch (error: any) {
      toast.error('Failed to load messages: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id)
    setEditContent(message.content)
  }

  const handleSaveEdit = async (messageId: string) => {
    if (!editContent.trim()) {
      toast.error('Message content cannot be empty')
      return
    }

    try {
      const response = await fetch(`/api/admin/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editContent }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update message')
      }

      const { message: updatedMessage } = await response.json()

      // Update local state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? updatedMessage : msg
        )
      )

      toast.success('Message updated successfully')
      setEditingMessageId(null)
      setEditContent('')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditContent('')
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[80vh]">
      {/* Left Panel - Real User Profile */}
      <div className="lg:w-1/4">
        <GlassCard className="p-6 h-full overflow-y-auto">
          <h3 className="text-lg font-bold text-gray-50 mb-4">Real User</h3>

          {/* Profile Picture */}
          {chat.real_user.profile_picture && (
            <div className="mb-4">
              <img
                src={chat.real_user.profile_picture}
                alt={chat.real_user.name}
                className="w-full h-48 object-cover rounded-glass-sm"
              />
            </div>
          )}

          {/* User Info */}
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-400 mb-1">Name</div>
              <div className="text-sm font-medium text-gray-200">
                {chat.real_user.name}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Display Name</div>
              <div className="text-sm font-medium text-gray-200">
                {chat.real_user.display_name}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Email</div>
              <div className="text-sm font-medium text-gray-200">
                {chat.real_user.email}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Age</div>
              <div className="text-sm font-medium text-gray-200">
                {chat.real_user.age}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Gender</div>
              <div className="text-sm font-medium text-gray-200 capitalize">
                {chat.real_user.gender}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Location</div>
              <div className="text-sm font-medium text-gray-200">
                {chat.real_user.location}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Credits</div>
              <div className="text-sm font-medium text-gray-200">
                {chat.real_user.credits}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Status</div>
              <div className="text-sm font-medium">
                {chat.real_user.is_active ? (
                  <span className="text-green-400">Active</span>
                ) : (
                  <span className="text-red-400">Blocked</span>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-6">
            <div className="text-xs text-gray-400 mb-2">Admin Notes</div>
            <div className="text-sm text-gray-300 bg-glass-light p-3 rounded-glass-sm">
              {chat.real_profile_notes || 'No notes'}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-2">
            <GlassButton
              onClick={() => onBlockUser(chat.real_user.id)}
              className="w-full text-sm py-2 bg-red-500/10 hover:bg-red-500/20 border-red-500/30"
            >
              {chat.real_user.is_active ? 'Block User' : 'Unblock User'}
            </GlassButton>
          </div>
        </GlassCard>
      </div>

      {/* Center Panel - Chat History */}
      <div className="lg:w-2/4">
        <GlassCard className="p-6 h-full flex flex-col">
          <h3 className="text-lg font-bold text-gray-50 mb-4">Chat History</h3>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <LoadingSpinner />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No messages yet
              </div>
            ) : (
              messages.map((message) => {
                const isReal = message.sender_type === 'real'
                const isEditing = editingMessageId === message.id

                return (
                  <div
                    key={message.id}
                    className={`flex ${isReal ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] ${
                        isReal
                          ? 'bg-primary-red/20 border-primary-red/30'
                          : 'bg-glass-light border-white/10'
                      } border rounded-glass-sm p-3`}
                    >
                      {/* Sender Info */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium text-gray-400">
                          {isReal ? chat.real_user.name : chat.fictional_user.name}
                          {!isReal && message.handled_by_operator_id && (
                            <span className="ml-2 text-purple-400">
                              (via {chat.operator?.name || 'Operator'})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTime(message.created_at)}
                        </div>
                      </div>

                      {/* Message Content */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full px-3 py-2 bg-glass-light border border-white/10 rounded-glass-sm text-gray-300 focus:outline-none focus:border-primary-red resize-none"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(message.id)}
                              className="px-3 py-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-glass-sm hover:bg-green-500/30"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1 text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-glass-sm hover:bg-gray-500/30"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm text-gray-200 break-words">
                            {message.content}
                          </div>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleEditMessage(message)}
                            className="mt-2 text-xs text-gray-400 hover:text-primary-red"
                          >
                            Edit
                          </button>
                        </>
                      )}

                      {/* Free Message Badge */}
                      {message.is_free_message && (
                        <div className="mt-2">
                          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full">
                            Free
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Chat Actions */}
          <div className="border-t border-white/10 pt-4 space-y-2">
            <div className="flex gap-2">
              <GlassButton
                onClick={() => onReassign(chat.id)}
                className="flex-1 text-sm py-2"
              >
                Reassign Chat
              </GlassButton>
              <GlassButton
                onClick={() => onForceClose(chat.id)}
                className="flex-1 text-sm py-2 bg-red-500/10 hover:bg-red-500/20 border-red-500/30"
              >
                Force Close
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Right Panel - Fictional Profile */}
      <div className="lg:w-1/4">
        <GlassCard className="p-6 h-full overflow-y-auto">
          <h3 className="text-lg font-bold text-gray-50 mb-4">Fictional Profile</h3>

          {/* Profile Pictures */}
          {chat.fictional_user.profile_pictures &&
            chat.fictional_user.profile_pictures.length > 0 && (
              <div className="mb-4 space-y-2">
                {chat.fictional_user.profile_pictures.map((pic, index) => (
                  <img
                    key={index}
                    src={pic}
                    alt={`${chat.fictional_user.name} ${index + 1}`}
                    className="w-full h-48 object-cover rounded-glass-sm"
                  />
                ))}
              </div>
            )}

          {/* Profile Info */}
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-400 mb-1">Name</div>
              <div className="text-sm font-medium text-gray-200">
                {chat.fictional_user.name}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Age</div>
              <div className="text-sm font-medium text-gray-200">
                {chat.fictional_user.age}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Gender</div>
              <div className="text-sm font-medium text-gray-200 capitalize">
                {chat.fictional_user.gender}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Location</div>
              <div className="text-sm font-medium text-gray-200">
                {chat.fictional_user.location}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Bio</div>
              <div className="text-sm text-gray-300">
                {chat.fictional_user.bio || 'No bio'}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">Status</div>
              <div className="text-sm font-medium">
                {chat.fictional_user.is_active ? (
                  <span className="text-green-400">Active</span>
                ) : (
                  <span className="text-red-400">Inactive</span>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-6">
            <div className="text-xs text-gray-400 mb-2">Character Notes</div>
            <div className="text-sm text-gray-300 bg-glass-light p-3 rounded-glass-sm">
              {chat.fictional_profile_notes || 'No notes'}
            </div>
          </div>

          {/* Operator Info */}
          {chat.operator && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="text-xs text-gray-400 mb-2">Current Operator</div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-200">
                  {chat.operator.name}
                </div>
                <div className="text-xs text-gray-400">{chat.operator.email}</div>
                <div className="text-xs">
                  {chat.operator.is_available ? (
                    <span className="text-green-400">Available</span>
                  ) : (
                    <span className="text-yellow-400">Busy</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
