import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { chatId, reason } = await request.json()

    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      )
    }

    // Verify operator is assigned to this chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('assigned_operator_id, assignment_time')
      .eq('id', chatId)
      .single()

    if (chatError || !chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      )
    }

    if (chat.assigned_operator_id !== user.id) {
      // Check if user is admin (admins can unassign any chat)
      const { data: adminCheck } = await supabase
        .from('admins')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!adminCheck) {
        return NextResponse.json(
          { error: 'Not authorized to unassign this chat' },
          { status: 403 }
        )
      }
    }

    // Unassign the chat and return it to the queue
    const { error: updateError } = await supabase
      .from('chats')
      .update({
        assigned_operator_id: null,
        assignment_time: null,
        chat_state: 'waiting_assignment', // Return to queue
        updated_at: new Date().toISOString()
      })
      .eq('id', chatId)

    if (updateError) {
      console.error('Error unassigning chat:', updateError)
      return NextResponse.json(
        { error: 'Failed to unassign chat' },
        { status: 500 }
      )
    }

    // Log the release if there was an assignment
    if (chat.assigned_operator_id) {
      await supabase
        .from('chat_assignments')
        .update({
          released_at: new Date().toISOString(),
          release_reason: reason || 'manual_unassign'
        })
        .eq('chat_id', chatId)
        .eq('operator_id', chat.assigned_operator_id)
        .is('released_at', null)

      // Remove operator activity record
      await supabase
        .from('operator_activity')
        .delete()
        .eq('chat_id', chatId)
        .eq('operator_id', chat.assigned_operator_id)
    }

    return NextResponse.json(
      { success: true, message: 'Chat unassigned successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unassign error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

