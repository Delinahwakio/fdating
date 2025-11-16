'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
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
  
  // Memoize supabase client to avoid recreating it on every render
  const supabase = useMemo(() => createClient(), [])
  
  // Use ref to store the callback to avoid dependency issues
  const onNewMessageRef = useRef(onNewMessage)
  
  // Update ref when callback changes
  useEffect(() => {
    onNewMessageRef.current = onNewMessage
  }, [onNewMessage])

  // Subscribe to new messages
  useEffect(() => {
    let channel: RealtimeChannel | null = null
    let reconnectAttempts = 0
    const maxReconnectAttempts = 5
    const reconnectDelay = 1000 // Start with 1 second

    const setupSubscription = () => {
      setConnectionState((prev) => {
        // Only update if not already connecting to avoid unnecessary re-renders
        if (prev.status !== 'connecting') {
          return { status: 'connecting', error: null }
        }
        return prev
      })

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

            // Call callback using ref to avoid dependency issues
            if (onNewMessageRef.current) {
              onNewMessageRef.current(newMessage)
            }

            setConnectionState((prev) => {
              // Only update if not already connected to avoid unnecessary re-renders
              if (prev.status !== 'connected') {
                return { status: 'connected', error: null }
              }
              return prev
            })
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
            setConnectionState((prev) => {
              if (prev.status !== 'connected') {
                return { status: 'connected', error: null }
              }
              return prev
            })
            reconnectAttempts = 0
          } else if (status === 'CHANNEL_ERROR') {
            setConnectionState((prev) => {
              if (prev.status !== 'disconnected' || prev.error !== 'Connection error') {
                return { 
                  status: 'disconnected', 
                  error: 'Connection error' 
                }
              }
              return prev
            })
            
            // Attempt reconnection with exponential backoff
            if (reconnectAttempts < maxReconnectAttempts) {
              const delay = reconnectDelay * Math.pow(2, reconnectAttempts)
              reconnectAttempts++
              
              setConnectionState((prev) => {
                const newError = `Reconnecting... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`
                if (prev.status !== 'reconnecting' || prev.error !== newError) {
                  return { 
                    status: 'reconnecting', 
                    error: newError
                  }
                }
                return prev
              })
              
              setTimeout(() => {
                if (channel) {
                  supabase.removeChannel(channel)
                }
                setupSubscription()
              }, delay)
            } else {
              setConnectionState((prev) => {
                const newError = 'Failed to connect after multiple attempts. Please refresh the page.'
                if (prev.status !== 'disconnected' || prev.error !== newError) {
                  return { 
                    status: 'disconnected', 
                    error: newError
                  }
                }
                return prev
              })
            }
          } else if (status === 'CLOSED') {
            setConnectionState((prev) => {
              if (prev.status !== 'disconnected' || prev.error !== 'Connection closed') {
                return { status: 'disconnected', error: 'Connection closed' }
              }
              return prev
            })
          }
        })
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [chatId, supabase])

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
