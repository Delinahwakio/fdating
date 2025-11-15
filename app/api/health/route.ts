import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Health check endpoint for monitoring and uptime services
 * Returns 200 if application and database are healthy
 */
export async function GET() {
  try {
    const startTime = Date.now()

    // Check database connection
    const supabase = await createClient()
    const { error: dbError } = await supabase
      .from('real_users')
      .select('id')
      .limit(1)
      .single()

    // Allow "no rows" error as it just means empty table
    if (dbError && dbError.code !== 'PGRST116') {
      throw new Error(`Database check failed: ${dbError.message}`)
    }

    const responseTime = Date.now() - startTime

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
        responseTime: `${responseTime}ms`
      },
      version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'dev',
      environment: process.env.NODE_ENV || 'development'
    }, { status: 200 })

  } catch (error) {
    console.error('Health check failed:', error)

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV || 'development'
    }, { status: 503 })
  }
}
