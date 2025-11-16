'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { GlassCard } from '@/components/shared/GlassCard'
import { formatDistanceToNow } from '@/lib/utils/formatting'

interface ChatWithProfile {
  id: string
  created_at: string
  updated_at: string
  message_count: number
  fictional_user: {
    id: string
    name: string
    age: number
    location: string
    profile_pictures: string[]
  }
  last_message: {
    content: string
    created_at: string
    sender_type: 'real' | 'fictional'
  } | null
}

export default function ChatsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  // Memoize supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])
  const [chats, setChats] = useState<ChatWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  // Handle scroll restoration to prevent Next.js warnings
  useEffect(() => {
    // Scroll to top on mount to prevent scroll restoration issues
    window.scrollTo(0, 0)
  }, [pathname])

  // Memoize fetchChats to prevent unnecessary recreations
  const fetchChats = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      // Fetch all chats for the user with fictional user details
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select(`
          id,
          created_at,
          updated_at,
          message_count,
          fictional_user:fictional_users(
            id,
            name,
            age,
            location,
            profile_pictures
          )
        `)
        .eq('real_user_id', user.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })

      if (chatsError) throw chatsError

      // Fetch last message for each chat
      const chatsWithMessages = await Promise.all(
        (chatsData || []).map(async (chat) => {
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, created_at, sender_type')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return {
            ...chat,
            last_message: lastMessage || null,
          } as ChatWithProfile
        })
      )

      setChats(chatsWithMessages)
    } catch (error) {
      console.error('Error fetching chats:', error)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    if (!user) return

    fetchChats()

    // Subscribe to real-time updates with debouncing to prevent excessive refetches
    let debounceTimer: NodeJS.Timeout | null = null
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        fetchChats()
      }, 500) // Debounce to 500ms
    }

    const channel = supabase
      .channel('user-chats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `real_user_id=eq.${user.id}`,
        },
        debouncedFetch
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        debouncedFetch
      )
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      supabase.removeChannel(channel)
    }
  }, [user, supabase, fetchChats])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F23]">
        <LoadingSpinner />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F23]">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#0F0F23]">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-50 mb-6">
          Your Chats
        </h1>

        {chats.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-gray-300 text-lg mb-4">You don't have any chats yet.</p>
            <Link
              href="/discover"
              className="text-primary-red hover:text-red-400 transition-colors"
            >
              Start discovering profiles →
            </Link>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {chats.map((chat) => (
              <Link key={chat.id} href={`/chat/${chat.id}`}>
                <GlassCard className="p-4 hover:bg-glass-light transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    {/* Profile Picture */}
                    <div className="flex-shrink-0">
                      {chat.fictional_user.profile_pictures && chat.fictional_user.profile_pictures.length > 0 ? (
                        <img
                          src={chat.fictional_user.profile_pictures[0]}
                          alt={chat.fictional_user.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl">
                          {chat.fictional_user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-semibold text-gray-50 truncate">
                          {chat.fictional_user.name}
                        </h3>
                        {chat.last_message && (
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                            {formatDistanceToNow(new Date(chat.last_message.created_at))}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                        <span>{chat.fictional_user.age}</span>
                        <span>•</span>
                        <span>{chat.fictional_user.location}</span>
                      </div>
                      {chat.last_message && (
                        <p className="text-sm text-gray-300 truncate">
                          {chat.last_message.sender_type === 'real' ? 'You: ' : ''}
                          {chat.last_message.content}
                        </p>
                      )}
                      {!chat.last_message && (
                        <p className="text-sm text-gray-400 italic">
                          No messages yet
                        </p>
                      )}
                    </div>

                    {/* Message Count Badge */}
                    {chat.message_count > 0 && (
                      <div className="flex-shrink-0">
                        <span className="px-2 py-1 text-xs font-medium bg-primary-red/20 text-primary-red rounded-full">
                          {chat.message_count} message{chat.message_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

