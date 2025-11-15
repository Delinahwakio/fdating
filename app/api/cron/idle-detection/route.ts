import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Cron job endpoint for detecting and reassigning idle chats
 * Should be called every minute by Vercel Cron
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (authHeader !== expectedAuth) {
      console.error('Unauthorized cron job attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    
    // Get idle timeout from configuration
    const { data: idleTimeoutConfig } = await supabase
      .from('platform_config')
      .select('value')
      .eq('key', 'idle_timeout_minutes')
      .single()

    const idleTimeoutMinutes = idleTimeoutConfig?.value ? parseInt(idleTimeoutConfig.value) : 5
    
    // Calculate threshold time
    const idleThreshold = new Date(Date.now() - idleTimeoutMinutes * 60 * 1000).toISOString()

    // Find chats that have been assigned for more than the configured timeout
    const { data: potentiallyIdleChats, error: chatsError } = await supabase
      .from('chats')
      .select('id, assigned_operator_id, assignment_time')
      .not('assigned_operator_id', 'is', null)
      .lt('assignment_time', idleThreshold)
      .eq('is_active', true)

    if (chatsError) {
      console.error('Error fetching potentially idle chats:', chatsError)
      return NextResponse.json(
        { error: 'Failed to fetch chats' },
        { status: 500 }
      )
    }

    if (!potentiallyIdleChats || potentiallyIdleChats.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No idle chats found',
        processed: 0
      })
    }

    const results = {
      checked: potentiallyIdleChats.length,
      reassigned: 0,
      flagged: 0,
      errors: 0
    }

    // Check each potentially idle chat
    for (const chat of potentiallyIdleChats) {
      try {
        // Check operator activity from heartbeat
        const { data: activity, error: activityError } = await supabase
          .from('operator_activity')
          .select('last_activity')
          .eq('chat_id', chat.id)
          .eq('operator_id', chat.assigned_operator_id)
          .single()

        if (activityError && activityError.code !== 'PGRST116') {
          // PGRST116 is "not found" error, which is expected for some cases
          console.error(`Error checking activity for chat ${chat.id}:`, activityError)
          results.errors++
          continue
        }

        // If no activity record or activity is older than the configured timeout, reassign
        const shouldReassign = !activity || 
          new Date(activity.last_activity) < new Date(idleThreshold)

        if (shouldReassign) {
          // Call the release_and_reassign_chat function
          const { data: reassignResult, error: reassignError } = await supabase
            .rpc('release_and_reassign_chat', {
              p_chat_id: chat.id,
              p_reason: 'idle_timeout'
            })

          if (reassignError) {
            console.error(`Error reassigning chat ${chat.id}:`, reassignError)
            results.errors++
            continue
          }

          // reassignResult is true if reassigned, false if flagged for admin review
          if (reassignResult) {
            results.reassigned++
            console.log(`Chat ${chat.id} reassigned due to idle timeout`)
          } else {
            results.flagged++
            console.log(`Chat ${chat.id} flagged for admin review (max reassignments reached)`)
          }

          // Notify the operator (optional - could use a notification system)
          // For now, we'll just log it
          console.log(`Operator ${chat.assigned_operator_id} had chat ${chat.id} reassigned due to inactivity`)
        }
      } catch (error) {
        console.error(`Error processing chat ${chat.id}:`, error)
        results.errors++
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Idle detection completed',
      results
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Disable body parsing for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
