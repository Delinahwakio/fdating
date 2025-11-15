import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API endpoint for collecting application logs
 * Used by the logger utility to send critical errors to the database
 */
export async function POST(request: Request) {
  try {
    const log = await request.json()

    // Validate log entry
    if (!log.level || !log.message || !log.timestamp) {
      return NextResponse.json(
        { error: 'Invalid log entry' },
        { status: 400 }
      )
    }

    // Only store error and critical logs
    if (log.level !== 'error' && log.level !== 'critical') {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const supabase = createClient()

    // Store log in database (you may want to create a logs table)
    // For now, we'll just log to console in production
    console.error('Application Error:', {
      level: log.level,
      message: log.message,
      context: log.context,
      error: log.error,
      timestamp: log.timestamp
    })

    // Optional: Send to external monitoring service
    // await sendToExternalService(log)

    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    console.error('Failed to process log:', error)
    return NextResponse.json(
      { error: 'Failed to process log' },
      { status: 500 }
    )
  }
}
