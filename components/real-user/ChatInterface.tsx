'use client'

import { FC, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'
import { GlassInput } from '@/components/shared/GlassInput'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Message } from '@/types/database'
import { formatDistanceToNow } from '@/lib/utils/formatting'
import { useRealtimeMessages } from '@/lib/hooks/useRealtimeMessages'

interface ChatInterfaceProps {
  chatId: string
  fictionalUserId: string
  currentUserId: string
  initialMessages?: Message[]
  initialCredits?: number
  initialMessageCount?: number
}

export const ChatInterface: FC<ChatInterfaceProps> = ({
  chatId,
  fictionalUserId,
  currentUserId,
  initialMessages = [],
  initialCredits = 0,
  initialMessageCount = 0
}) => {
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [credits, setCredits] = useState(initialCredits)
  const [messageCount, setMessageCount] = useState(initialMessageCount)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Memoize markAsRead callback to avoid recreating onNewMessage
  const markAsReadRef = useRef<((messageIds: string[]) => Promise<void>) | null>(null)

  // Use real-time messages hook
  const {
    messages,
    connectionState,
    typingUsers,
    markAsRead,
    sendTypingIndicator
  } = useRealtimeMessages({
    chatId,
    initialMessages,
    onNewMessage: useCallback((message) => {
      // Mark incoming messages as read
      if (message.sender_type === 'fictional' && markAsReadRef.current) {
        markAsReadRef.current([message.id])
      }
    }, [])
  })

  // Update ref when markAsRead changes
  useEffect(() => {
    markAsReadRef.current = markAsRead
  }, [markAsRead])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, optimisticMessages])

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true)
      sendTypingIndicator(currentUserId, true)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      sendTypingIndicator(currentUserId, false)
    }, 2000)
  }, [isTyping, currentUserId, sendTypingIndicator])

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (isTyping) {
        sendTypingIndicator(currentUserId, false)
      }
    }
  }, [isTyping, currentUserId, sendTypingIndicator])

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return

    const content = messageInput.trim()
    if (content.length > 5000) {
      setError('Message is too long. Maximum 5000 characters.')
      return
    }

    setError(null)
    setMessageInput('')
    setIsSending(true)

    // Create optimistic message
    const tempId = `temp-${Date.now()}`
    const optimisticMsg: Message = {
      id: tempId,
      chat_id: chatId,
      sender_type: 'real',
      content,
      handled_by_operator_id: null,
      is_free_message: messageCount < 3,
      created_at: new Date().toISOString(),
      delivered_at: null,
      read_at: null
    }

    setOptimisticMessages(prev => [...prev, optimisticMsg])

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          content,
          senderId: currentUserId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()
      
      // Update credits and message count
      if (!data.message.is_free_message) {
        setCredits(prev => prev - 1)
      }
      setMessageCount(prev => prev + 1)

      // Remove optimistic message
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId))
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value)
    handleTyping()
  }

  const allMessages = [...messages, ...optimisticMessages]
  const freeMessagesRemaining = Math.max(0, 3 - messageCount)
  const isNextMessageFree = messageCount < 3
  const isOtherUserTyping = Array.from(typingUsers).some(id => id !== currentUserId)

  return (
    <div className="flex flex-col h-full">
      {/* Credit Status Bar */}
      <div className="bg-[#1A1A2E]/80 backdrop-blur-sm p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="text-gray-300">
              <span className="font-semibold text-gray-50">Credits:</span>{' '}
              <span className={credits < 5 ? 'text-red-500' : 'text-green-500'}>
                {credits}
              </span>
            </div>
            {freeMessagesRemaining > 0 && (
              <div className="text-sm text-gray-400">
                {freeMessagesRemaining} free message{freeMessagesRemaining !== 1 ? 's' : ''} remaining
              </div>
            )}
            {/* Connection Status */}
            {connectionState.status !== 'connected' && (
              <div className="flex items-center gap-2 text-sm">
                {connectionState.status === 'connecting' && (
                  <span className="text-yellow-500">Connecting...</span>
                )}
                {connectionState.status === 'reconnecting' && (
                  <span className="text-yellow-500">Reconnecting...</span>
                )}
                {connectionState.status === 'disconnected' && (
                  <span className="text-red-500">Disconnected</span>
                )}
              </div>
            )}
          </div>
          {credits < 5 && (
            <a href="/credits" className="text-sm text-red-500 hover:text-red-400">
              Buy Credits
            </a>
          )}
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-4xl mx-auto">
          {allMessages.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p>No messages yet. Start the conversation!</p>
              <p className="text-sm mt-2">Your first 3 messages are free</p>
            </div>
          ) : (
            allMessages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                isOwn={message.sender_type === 'real'}
              />
            ))
          )}
          {/* Typing Indicator */}
          {isOtherUserTyping && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-[#1A1A2E]/80 backdrop-blur-sm p-4 border-t border-gray-700/50">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-3 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          {connectionState.error && (
            <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg text-yellow-400 text-sm">
              {connectionState.error}
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1">
              <GlassInput
                value={messageInput}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isSending || connectionState.status === 'disconnected'}
                maxLength={5000}
              />
              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>
                  {messageInput.length}/5000 characters
                </span>
                {!isNextMessageFree && (
                  <span className="text-yellow-500">
                    This message will cost 1 credit
                  </span>
                )}
              </div>
            </div>
            <GlassButton
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || isSending || connectionState.status === 'disconnected'}
              className="px-6"
            >
              {isSending ? <LoadingSpinner size="sm" /> : 'Send'}
            </GlassButton>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ChatBubbleProps {
  message: Message
  isOwn: boolean
}

const ChatBubble: FC<ChatBubbleProps> = ({ message, isOwn }) => {
  const isOptimistic = message.id.startsWith('temp-')

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[70%] rounded-2xl p-4 ${
          isOwn
            ? 'bg-red-600/20 border border-red-500/30'
            : 'bg-gray-800/50 border border-gray-700/50'
        } ${isOptimistic ? 'opacity-60' : ''}`}
      >
        <p className="text-gray-50 whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
          <span>
            {formatDistanceToNow(new Date(message.created_at))}
          </span>
          {message.is_free_message && (
            <span className="text-green-500">• Free</span>
          )}
          {isOptimistic && (
            <span className="text-yellow-500">• Sending...</span>
          )}
        </div>
      </div>
    </div>
  )
}
