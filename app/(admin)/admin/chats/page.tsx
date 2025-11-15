'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { ChatMonitorGrid } from '@/components/admin/ChatMonitorGrid'
import { AdminChatDetail } from '@/components/admin/AdminChatDetail'
import { ReassignChatModal } from '@/components/admin/ReassignChatModal'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Modal } from '@/components/shared/Modal'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { Chat, Operator, RealUser, FictionalUser } from '@/types/database'

interface ChatWithDetails extends Chat {
  real_user: RealUser
  fictional_user: FictionalUser
  operator?: Operator | null
}

export default function ChatsPage() {
  const [chats, setChats] = useState<ChatWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChat, setSelectedChat] = useState<ChatWithDetails | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false)
  const [reassignChatId, setReassignChatId] = useState<string | null>(null)
  const [reassignCurrentOperatorId, setReassignCurrentOperatorId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchChats()

    // Set up real-time subscription for chat changes
    const chatsChannel = supabase
      .channel('chats-monitoring')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
        },
        (payload) => {
          console.log('Chat change detected:', payload)
          fetchChats()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'operators',
        },
        (payload) => {
          console.log('Operator change detected:', payload)
          // Update operator info in chats
          setChats((prevChats) =>
            prevChats.map((chat) => {
              if (chat.operator?.id === payload.new.id) {
                return {
                  ...chat,
                  operator: payload.new as Operator,
                }
              }
              return chat
            })
          )
        }
      )
      .subscribe()

    // Set up interval to update idle timers every 10 seconds
    const timerInterval = setInterval(() => {
      setChats((prevChats) => [...prevChats])
    }, 10000)

    return () => {
      supabase.removeChannel(chatsChannel)
      clearInterval(timerInterval)
    }
  }, [])

  const fetchChats = async () => {
    try {
      setLoading(true)

      // Fetch all active chats with related data
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select(
          `
          *,
          real_user:real_users(*),
          fictional_user:fictional_users(*),
          operator:operators(*)
        `
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (chatsError) throw chatsError

      setChats((chatsData as any) || [])
    } catch (error: any) {
      toast.error('Failed to load chats: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChatClick = (chat: ChatWithDetails) => {
    setSelectedChat(chat)
    setIsDetailModalOpen(true)
  }

  const handleReassign = async (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId)
    if (!chat) return

    setReassignChatId(chatId)
    setReassignCurrentOperatorId(chat.assigned_operator_id)
    setIsReassignModalOpen(true)
  }

  const handleReassignSuccess = () => {
    setIsReassignModalOpen(false)
    setReassignChatId(null)
    setReassignCurrentOperatorId(null)
    setIsDetailModalOpen(false)
    fetchChats()
  }

  const handleForceClose = async (chatId: string) => {
    if (!confirm('Are you sure you want to force close this chat?')) return

    try {
      const { error } = await supabase
        .from('chats')
        .update({
          is_active: false,
          assigned_operator_id: null,
          assignment_time: null,
        })
        .eq('id', chatId)

      if (error) throw error

      toast.success('Chat closed successfully')
      setIsDetailModalOpen(false)
      fetchChats()
    } catch (error: any) {
      toast.error('Failed to close chat: ' + error.message)
    }
  }

  const handleBlockUser = async (userId: string) => {
    const user = chats.find((c) => c.real_user.id === userId)?.real_user
    if (!user) return

    const action = user.is_active ? 'block' : 'unblock'
    if (!confirm(`Are you sure you want to ${action} this user?`)) return

    try {
      // Update user status
      const { error: userError } = await supabase
        .from('real_users')
        .update({ is_active: !user.is_active })
        .eq('id', userId)

      if (userError) throw userError

      // If blocking, close all active chats
      if (user.is_active) {
        const { error: chatsError } = await supabase
          .from('chats')
          .update({
            is_active: false,
            assigned_operator_id: null,
            assignment_time: null,
          })
          .eq('real_user_id', userId)
          .eq('is_active', true)

        if (chatsError) throw chatsError
      }

      toast.success(`User ${action}ed successfully`)
      setIsDetailModalOpen(false)
      fetchChats()
    } catch (error: any) {
      toast.error(`Failed to ${action} user: ` + error.message)
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-50 mb-2">Chat Monitoring</h1>
          <p className="text-gray-400">
            Monitor all active chats and operator performance in real-time
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner />
          </div>
        ) : (
          <ChatMonitorGrid chats={chats} onChatClick={handleChatClick} />
        )}

        {/* Detail Modal */}
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
        >
          {selectedChat && (
            <AdminChatDetail
              chat={selectedChat}
              onReassign={handleReassign}
              onForceClose={handleForceClose}
              onBlockUser={handleBlockUser}
            />
          )}
        </Modal>

        {/* Reassign Modal */}
        <Modal
          isOpen={isReassignModalOpen}
          onClose={() => setIsReassignModalOpen(false)}
        >
          {reassignChatId && (
            <ReassignChatModal
              chatId={reassignChatId}
              currentOperatorId={reassignCurrentOperatorId}
              onSuccess={handleReassignSuccess}
              onCancel={() => setIsReassignModalOpen(false)}
            />
          )}
        </Modal>
      </div>
    </AdminLayout>
  )
}
