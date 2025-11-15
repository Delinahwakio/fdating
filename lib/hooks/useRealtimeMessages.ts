'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Message } from '@/types/database'
import { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeMessagesOptions {
  chatId: string
  initialMessages: Message[]
  onNewMessage?: (message: Message) => void
}

interface ConnectionState {
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting'
  error: string | null
}

export const useRealtimeMessages = ({
  chatId,
  initialMessages,
  onNewMessage
}: UseRealtimeMessagesOptions) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'connecting',
    error: null
  })
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const supabase = createClient()

  // Subscribe to new messages
  useEffect(() => {
    let channel: RealtimeChannel | null = null
    let reconnectAttempts = 0
    const maxReconnectAttempts = 5
    const reconnectDelay = 1000 // Start with 1 second

    const setupSubscription = () => {
      setConnectionState({ status: 'connecting', error: null })

      channel = supabase
        .channel(`chat:${chatId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`
          },
          (payload) => {
            const newMessage = payload.new as Message
            
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMessage.id)) {
                return prev
              }
              return [...prev, newMessage]
            })

            if (onNewMessage) {
              onNewMessage(newMessage)
            }

            setConnectionState({ status: 'connected', error: null })
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`
          },
          (payload) => {
            const updatedMessage = payload.new as Message
            
            setMessages((prev) =>
              prev.map(m => m.id === updatedMessage.id ? updatedMessage : m)
            )
          }
        )
        .on('presence', { event: 'sync' }, () => {
          const state = channel?.presenceState()
          if (state) {
            const typing = new Set<string>()
            Object.values(state).forEach((presences: any) => {
              presences.forEach((presence: any) => {
                if (presence.typing) {
                  typing.add(presence.user_id)
                }
              })
            })
            setTypingUsers(typing)
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionState({ status: 'connected', error: null })
            reconnectAttempts = 0
          } else if (status === 'CHANNEL_ERROR') {
            setConnectionState({ 
              status: 'disconnected', 
              error: 'Connection error' 
            })
            
            // Attempt reconnection with exponential backoff
            if (reconnectAttempts < maxReconnectAttempts) {
              const delay = reconnectDelay * Math.pow(2, reconnectAttempts)
              reconnectAttempts++
              
              setConnectionState({ 
                status: 'reconnecting', 
                error: `Reconnecting... (attempt ${reconnectAttempts}/${maxReconnectAttempts})` 
              })
              
              setTimeout(() => {
                if (channel) {
                  supabase.removeChannel(channel)
                }
                setupSubscription()
              }, delay)
            } else {
              setConnectionState({ 
                status: 'disconnected', 
                error: 'Failed to connect after multiple attempts. Please refresh the page.' 
              })
            }
          } else if (status === 'CLOSED') {
            setConnectionState({ status: 'disconnected', error: 'Connection closed' })
          }
        })
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [chatId, onNewMessage, supabase])

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return

    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', messageIds)
      .is('read_at', null)

    if (error) {
      console.error('Failed to mark messages as read:', error)
    }
  }, [supabase])

  // Send typing indicator
  const sendTypingIndicator = useCallback(async (userId: string, isTyping: boolean) => {
    const channel = supabase.channel(`chat:${chatId}`)
    
    await channel.track({
      user_id: userId,
      typing: isTyping,
      online_at: new Date().toISOString()
    })
  }, [chatId, supabase])

  return {
    messages,
    connectionState,
    typingUsers,
    markAsRead,
    sendTypingIndicator
  }
}
