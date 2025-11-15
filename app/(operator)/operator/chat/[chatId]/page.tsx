'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ThreePanelChat, ProfilePanel, OperatorChatInterface } from '@/components/operator'
import { IdleWarning } from '@/components/operator/IdleWarning'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useIdleDetection } from '@/lib/hooks/useIdleDetection'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { RealUser, FictionalUser, Chat, Message } from '@/types/database'

interface ChatData extends Chat {
  real_user: RealUser
  fictional_user: FictionalUser
}

export default function OperatorChatPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const chatId = params.chatId as string

  const [chat, setChat] = useState<ChatData | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showIdleWarning, setShowIdleWarning] = useState(false)
  const [idleRemainingTime, setIdleRemainingTime] = useState(0)
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(5)

  // Fetch idle timeout configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await supabase
          .from('platform_config')
          .select('value')
          .eq('key', 'idle_timeout_minutes')
          .single()
        
        if (data?.value) {
          setIdleTimeoutMinutes(parseInt(data.value))
        }
      } catch (error) {
        console.error('Error fetching idle timeout config:', error)
      }
    }
    fetchConfig()
  }, [supabase])

  // Idle detection callbacks
  const handleIdleWarning = useCallback(() => {
    setShowIdleWarning(true)
    toast.error('You have been idle for too long!', {
      duration: 5000,
      icon: '⚠️'
    })
  }, [])

  const handleIdleTimeout = useCallback(() => {
    toast.error('Chat reassigned due to inactivity')
    router.push('/operator/waiting')
  }, [router])

  const handleDismissWarning = useCallback(() => {
    setShowIdleWarning(false)
  }, [])

  // Initialize idle detection with configurable timeout
  const timeoutThreshold = idleTimeoutMinutes * 60 * 1000
  const warningThreshold = Math.max((idleTimeoutMinutes - 1) * 60 * 1000, 60 * 1000) // 1 minute before timeout, minimum 1 minute
  
  const { getIdleTime } = useIdleDetection({
    chatId: chatId || '',
    operatorId: user?.id || '',
    onWarning: handleIdleWarning,
    onTimeout: handleIdleTimeout,
    warningThreshold,
    timeoutThreshold,
    heartbeatInterval: 30 * 1000, // 30 seconds
    checkInterval: 10 * 1000 // 10 seconds
  })

  // Update remaining time for warning display
  useEffect(() => {
    if (!showIdleWarning) return

    const interval = setInterval(() => {
      const idleTime = getIdleTime()
      const threshold = idleTimeoutMinutes * 60 * 1000
      const remaining = threshold - idleTime
      
      if (remaining <= 0) {
        setIdleRemainingTime(0)
        clearInterval(interval)
      } else {
        setIdleRemainingTime(remaining)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [showIdleWarning, getIdleTime])

  // Fetch chat data
  useEffect(() => {
    if (!user || !chatId) return

    const fetchChatData = async () => {
      try {
        // Fetch chat with related data
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .select(`
            *,
            real_user:real_users(*),
            fictional_user:fictional_users(*)
          `)
          .eq('id', chatId)
          .single()

        if (chatError) throw chatError

        // Verify operator is assigned to this chat
        if (chatData.assigned_operator_id !== user.id) {
          toast.error('You are not assigned to this chat')
          router.push('/operator/waiting')
          return
        }

        setChat(chatData as ChatData)

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true })

        if (messagesError) throw messagesError

        setMessages(messagesData || [])
      } catch (err) {
        console.error('Error fetching chat data:', err)
        setError('Failed to load chat data')
        toast.error('Failed to load chat')
      } finally {
        setLoading(false)
      }
    }

    fetchChatData()
  }, [user, chatId, supabase, router])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0F0F23]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !chat) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0F0F23]">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">{error || 'Chat not found'}</p>
          <button
            onClick={() => router.push('/operator/waiting')}
            className="text-gray-300 hover:text-white"
          >
            Return to waiting room
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <ThreePanelChat
        leftPanel={
          <ProfilePanel
            title="Real User Profile"
            profile={chat.real_user}
            notes={chat.real_profile_notes}
            chatId={chatId}
            notesField="real_profile_notes"
          />
        }
        centerPanel={
          <OperatorChatInterface
            chatId={chatId}
            operatorId={user!.id}
            fictionalUserId={chat.fictional_user_id}
            realUserName={chat.real_user.display_name}
            fictionalUserName={chat.fictional_user.name}
            initialMessages={messages}
          />
        }
        rightPanel={
          <ProfilePanel
            title="Fictional Profile"
            profile={chat.fictional_user}
            notes={chat.fictional_profile_notes}
            chatId={chatId}
            notesField="fictional_profile_notes"
          />
        }
      />
      
      {/* Idle Warning Modal */}
      <IdleWarning
        isVisible={showIdleWarning}
        remainingTime={idleRemainingTime}
        onDismiss={handleDismissWarning}
      />
    </>
  )
}
