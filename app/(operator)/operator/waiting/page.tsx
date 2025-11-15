'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useAuth } from '@/lib/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

interface QueueStats {
  waitingChats: number
  isAvailable: boolean
}

export default function OperatorWaitingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  const [isAvailable, setIsAvailable] = useState(false)
  const [waitingChats, setWaitingChats] = useState(0)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [assignmentNotification, setAssignmentNotification] = useState<string | null>(null)

  // Fetch initial operator status and queue stats
  useEffect(() => {
    if (!user) return

    const fetchInitialData = async () => {
      try {
        // Get operator status
        const { data: operator, error: opError } = await supabase
          .from('operators')
          .select('is_available')
          .eq('id', user.id)
          .single()

        if (opError) throw opError

        setIsAvailable(operator?.is_available || false)

        // Get waiting chats count
        const { count, error: countError } = await supabase
          .from('chats')
          .select('*', { count: 'exact', head: true })
          .is('assigned_operator_id', null)
          .eq('is_active', true)

        if (countError) throw countError

        setWaitingChats(count || 0)
      } catch (error) {
        console.error('Error fetching initial data:', error)
        toast.error('Failed to load operator status')
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [user, supabase])

  // Subscribe to queue changes
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('queue-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: 'assigned_operator_id=is.null'
        },
        async () => {
          // Refresh waiting chats count
          const { count } = await supabase
            .from('chats')
            .select('*', { count: 'exact', head: true })
            .is('assigned_operator_id', null)
            .eq('is_active', true)

          setWaitingChats(count || 0)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chats',
          filter: `assigned_operator_id=eq.${user.id}`
        },
        (payload) => {
          // Chat assigned to this operator
          const chat = payload.new as any
          if (chat.assigned_operator_id === user.id) {
            setAssignmentNotification(chat.id)
            toast.success('New chat assigned!')
            
            // Navigate to chat after a brief delay
            setTimeout(() => {
              router.push(`/operator/chat/${chat.id}`)
            }, 1500)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase, router])

  // Handle availability toggle
  const handleToggleAvailability = async () => {
    if (!user) return

    setToggling(true)
    try {
      const newAvailability = !isAvailable

      // Update operator availability via API
      const response = await fetch('/api/operator/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isAvailable: newAvailability })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update availability')
      }

      setIsAvailable(newAvailability)

      if (newAvailability) {
        toast.success('You are now available for assignments')
        
        // Check if a chat was auto-assigned
        if (data.assignedChat) {
          setAssignmentNotification(data.assignedChat.id)
          toast.success('Chat assigned!')
          setTimeout(() => {
            router.push(`/operator/chat/${data.assignedChat.id}`)
          }, 1500)
        }
      } else {
        toast.success('You are now unavailable for new assignments')
      }
    } catch (error) {
      console.error('Error toggling availability:', error)
      toast.error('Failed to update availability')
    } finally {
      setToggling(false)
    }
  }

  // Request chat assignment
  const requestAssignment = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/operator/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 400 && data.message === 'No chats waiting') {
          // This is expected, not an error
          return
        }
        throw new Error(data.error || 'Failed to request assignment')
      }

      if (data.chat) {
        setAssignmentNotification(data.chat.id)
        toast.success('Chat assigned!')
        setTimeout(() => {
          router.push(`/operator/chat/${data.chat.id}`)
        }, 1500)
      }
    } catch (error) {
      console.error('Error requesting assignment:', error)
      // Don't show error toast for "no chats waiting" scenario
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F23]">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-[#0F0F23]">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <GlassCard className="p-8">
          <h1 className="text-3xl font-bold text-gray-50 mb-2">
            Operator Waiting Room
          </h1>
          <p className="text-gray-300">
            Toggle your availability to receive chat assignments
          </p>
        </GlassCard>

        {/* Availability Toggle */}
        <GlassCard className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-50 mb-2">
                Availability Status
              </h2>
              <p className="text-gray-300">
                {isAvailable ? (
                  <span className="text-green-400">● Available - Ready for assignments</span>
                ) : (
                  <span className="text-gray-400">● Unavailable - Not receiving assignments</span>
                )}
              </p>
            </div>
            <button
              onClick={handleToggleAvailability}
              disabled={toggling}
              className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors ${
                isAvailable ? 'bg-green-600' : 'bg-gray-600'
              } ${toggling ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-10 w-10 transform rounded-full bg-white transition-transform ${
                  isAvailable ? 'translate-x-12' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </GlassCard>

        {/* Queue Stats */}
        <GlassCard className="p-8">
          <h2 className="text-xl font-semibold text-gray-50 mb-4">
            Queue Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1A1A2E]/50 rounded-lg p-6 border border-gray-700">
              <div className="text-4xl font-bold text-red-500 mb-2">
                {waitingChats}
              </div>
              <div className="text-gray-300">
                {waitingChats === 1 ? 'Chat Waiting' : 'Chats Waiting'}
              </div>
            </div>
            <div className="bg-[#1A1A2E]/50 rounded-lg p-6 border border-gray-700">
              <div className="text-4xl font-bold text-gray-50 mb-2">
                {isAvailable ? 'Active' : 'Inactive'}
              </div>
              <div className="text-gray-300">
                Your Current Status
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Assignment Notification */}
        {assignmentNotification && (
          <GlassCard className="p-6 bg-green-900/20 border-green-500">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-400">
                  Chat Assigned!
                </h3>
                <p className="text-gray-300">
                  Redirecting you to the chat interface...
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Instructions */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-50 mb-3">
            How It Works
          </h3>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              <span>Toggle your availability to start receiving chat assignments</span>
            </li>
            <li className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              <span>When a chat is assigned, you'll receive a notification</span>
            </li>
            <li className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              <span>You can only handle one chat at a time</span>
            </li>
            <li className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              <span>Stay active to avoid idle timeout and reassignment</span>
            </li>
          </ul>
        </GlassCard>
      </div>
    </div>
  )
}
