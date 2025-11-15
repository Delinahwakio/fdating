'use client'

import { FC, useState, useEffect, useRef } from 'react'
import { GlassButton } from '@/components/shared/GlassButton'
import { GlassInput } from '@/components/shared/GlassInput'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Message } from '@/types/database'
import { formatDistanceToNow } from '@/lib/utils/formatting'
import { useRealtimeMessages } from '@/lib/hooks/useRealtimeMessages'
import { toast } from 'react-hot-toast'

interface OperatorChatInterfaceProps {
  chatId: string
  operatorId: string
  fictionalUserId: string
  realUserName: string
  fictionalUserName: string
  initialMessages: Message[]
}

export const OperatorChatInterface: FC<OperatorChatInterfaceProps> = ({
  chatId,
  operatorId,
  fictionalUserId,
  realUserName,
  fictionalUserName,
  initialMessages
}) => {
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Use real-time messages hook
  const { messages, connectionState } = useRealtimeMessages({
    chatId,
    initialMessages
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, optimisticMessages])

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
      sender_type: 'fictional',
      content,
      handled_by_operator_id: operatorId,
      is_free_message: false,
      created_at: new Date().toISOString(),
      delivered_at: null,
      read_at: null
    }

    setOptimisticMessages(prev => [...prev, optimisticMsg])

    try {
      const response = await fetch('/api/operator/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          content
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      // Remove optimistic message
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId))
      toast.error('Failed to send message')
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

  const allMessages = [...messages, ...optimisticMessages]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-[#1A1A2E]/80 backdrop-blur-sm p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-50">
              Chat: {realUserName} ↔ {fictionalUserName}
            </h2>
            <p className="text-sm text-gray-400">
              You are responding as {fictionalUserName}
            </p>
          </div>
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
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {allMessages.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p>No messages yet in this chat.</p>
            <p className="text-sm mt-2">Start the conversation as {fictionalUserName}</p>
          </div>
        ) : (
          allMessages.map((message) => (
            <OperatorChatBubble
              key={message.id}
              message={message}
              realUserName={realUserName}
              fictionalUserName={fictionalUserName}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-[#1A1A2E]/80 backdrop-blur-sm p-4 border-t border-gray-700/50">
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
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={`Type as ${fictionalUserName}...`}
              disabled={isSending || connectionState.status === 'disconnected'}
              maxLength={5000}
            />
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span>
                {messageInput.length}/5000 characters
              </span>
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
  )
}

interface OperatorChatBubbleProps {
  message: Message
  realUserName: string
  fictionalUserName: string
}

const OperatorChatBubble: FC<OperatorChatBubbleProps> = ({
  message,
  realUserName,
  fictionalUserName
}) => {
  const isOptimistic = message.id.startsWith('temp-')
  const isFictional = message.sender_type === 'fictional'
  const senderName = isFictional ? fictionalUserName : realUserName

  return (
    <div className={`flex ${isFictional ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className="max-w-[70%]">
        {/* Sender Name */}
        <div className={`text-xs text-gray-400 mb-1 ${isFictional ? 'text-right' : 'text-left'}`}>
          {senderName}
          {isFictional && message.handled_by_operator_id && (
            <span className="ml-2 text-blue-400">(You)</span>
          )}
        </div>
        
        {/* Message Bubble */}
        <div
          className={`rounded-2xl p-4 ${
            isFictional
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
            {isOptimistic && (
              <span className="text-yellow-500">• Sending...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
