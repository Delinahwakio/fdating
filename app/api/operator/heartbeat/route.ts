import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
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

    const { chatId, operatorId, lastActivity } = await request.json()

    // Verify operator ID matches authenticated user
    if (operatorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Verify operator is assigned to this chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('assigned_operator_id')
      .eq('id', chatId)
      .single()

    if (chatError || !chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      )
    }

    if (chat.assigned_operator_id !== user.id) {
      return NextResponse.json(
        { error: 'Not assigned to this chat' },
        { status: 403 }
      )
    }

    // Update or insert operator activity
    // First try to update existing record
    const { data: existing, error: selectError } = await supabase
      .from('operator_activity')
      .select('chat_id, operator_id')
      .eq('chat_id', chatId)
      .eq('operator_id', operatorId)
      .single()

    const lastActivityISO = new Date(lastActivity).toISOString()
    const nowISO = new Date().toISOString()

    let upsertError
    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('operator_activity')
        .update({
          last_activity: lastActivityISO,
          updated_at: nowISO
        })
        .eq('chat_id', chatId)
        .eq('operator_id', operatorId)
      upsertError = error
    } else {
      // Insert new record
      const { error } = await supabase
        .from('operator_activity')
        .insert({
          chat_id: chatId,
          operator_id: operatorId,
          last_activity: lastActivityISO,
          updated_at: nowISO
        })
      upsertError = error
    }

    if (upsertError) {
      console.error('Error updating operator activity:', upsertError)
      // Don't fail the request if activity update fails - it's not critical
      // Just log it and continue
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
