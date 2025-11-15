'use client'

import { FC, useEffect, useState } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'

interface IdleWarningProps {
  isVisible: boolean
  remainingTime: number // in milliseconds
  onDismiss: () => void
}

export const IdleWarning: FC<IdleWarningProps> = ({
  isVisible,
  remainingTime,
  onDismiss
}) => {
  const [audioPlayed, setAudioPlayed] = useState(false)

  useEffect(() => {
    if (isVisible && !audioPlayed) {
      // Play audio notification
      const audio = new Audio('/notification.mp3')
      audio.play().catch(err => {
        console.error('Failed to play notification sound:', err)
      })
      setAudioPlayed(true)
    }

    if (!isVisible) {
      setAudioPlayed(false)
    }
  }, [isVisible, audioPlayed])

  if (!isVisible) return null

  const remainingSeconds = Math.ceil(remainingTime / 1000)
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <GlassCard className="max-w-md w-full mx-4 p-6 border-2 border-yellow-500/50 animate-pulse">
        <div className="text-center">
          {/* Warning Icon */}
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* Warning Message */}
          <h2 className="text-2xl font-bold text-yellow-500 mb-2">
            Idle Warning
          </h2>
          <p className="text-gray-300 mb-4">
            You have been inactive for too long. This chat will be reassigned if you don't respond soon.
          </p>

          {/* Countdown Timer */}
          <div className="mb-6">
            <div className="text-4xl font-bold text-red-500 mb-2">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            <p className="text-sm text-gray-400">
              Time remaining until reassignment
            </p>
          </div>

          {/* Action Button */}
          <GlassButton
            onClick={onDismiss}
            className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/50"
          >
            I'm Still Here
          </GlassButton>

          <p className="text-xs text-gray-400 mt-4">
            Any activity will reset the timer
          </p>
        </div>
      </GlassCard>
    </div>
  )
}
