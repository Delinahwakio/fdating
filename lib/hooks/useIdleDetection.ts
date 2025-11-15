'use client'

import { useEffect, useRef, useCallback } from 'react'

interface IdleDetectionOptions {
  chatId: string
  operatorId: string
  onWarning: () => void
  onTimeout: () => void
  warningThreshold?: number // milliseconds before timeout to show warning
  timeoutThreshold?: number // milliseconds before timeout
  heartbeatInterval?: number // milliseconds between heartbeats
  checkInterval?: number // milliseconds between idle checks
}

interface IdleDetectionReturn {
  updateActivity: () => void
  getIdleTime: () => number
  isIdle: boolean
}

/**
 * Hook for tracking operator activity and detecting idle state
 * Sends heartbeats to server and triggers warnings/timeouts
 */
export const useIdleDetection = ({
  chatId,
  operatorId,
  onWarning,
  onTimeout,
  warningThreshold = 4 * 60 * 1000, // 4 minutes
  timeoutThreshold = 5 * 60 * 1000, // 5 minutes
  heartbeatInterval = 30 * 1000, // 30 seconds
  checkInterval = 10 * 1000 // 10 seconds
}: IdleDetectionOptions): IdleDetectionReturn => {
  const lastActivityRef = useRef<number>(Date.now())
  const warningShownRef = useRef<boolean>(false)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Update activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    warningShownRef.current = false
  }, [])

  // Get current idle time in milliseconds
  const getIdleTime = useCallback(() => {
    return Date.now() - lastActivityRef.current
  }, [])

  // Send heartbeat to server
  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch('/api/operator/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          operatorId,
          lastActivity: lastActivityRef.current
        })
      })
    } catch (error) {
      console.error('Failed to send heartbeat:', error)
    }
  }, [chatId, operatorId])

  // Check for idle state and trigger warnings/timeouts
  const checkIdleState = useCallback(() => {
    const idleTime = getIdleTime()

    // Check for timeout
    if (idleTime >= timeoutThreshold) {
      onTimeout()
      return
    }

    // Check for warning
    if (idleTime >= warningThreshold && !warningShownRef.current) {
      warningShownRef.current = true
      onWarning()
    }
  }, [getIdleTime, timeoutThreshold, warningThreshold, onWarning, onTimeout])

  useEffect(() => {
    // Track user interactions
    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove', 'click']
    
    events.forEach(event => {
      window.addEventListener(event, updateActivity)
    })

    // Start heartbeat interval
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, heartbeatInterval)

    // Start idle check interval
    checkIntervalRef.current = setInterval(checkIdleState, checkInterval)

    // Send initial heartbeat
    sendHeartbeat()

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity)
      })

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [updateActivity, sendHeartbeat, checkIdleState, heartbeatInterval, checkInterval])

  return {
    updateActivity,
    getIdleTime,
    isIdle: getIdleTime() >= warningThreshold
  }
}
