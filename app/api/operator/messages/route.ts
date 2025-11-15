import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { chatId, content } = await request.json()

    // Validate input
    if (!chatId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (content.length === 0 || content.length > 5000) {
      return NextResponse.json(
        { error: 'Message content must be between 1 and 5000 characters' },
        { status: 400 }
      )
    }

    // Verify operator is assigned to this chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('assigned_operator_id, is_active')
      .eq('id', chatId)
      .single()

    if (chatError) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      )
    }

    if (chat.assigned_operator_id !== user.id) {
      return NextResponse.json(
        { error: 'You are not assigned to this chat' },
        { status: 403 }
      )
    }

    if (!chat.is_active) {
      return NextResponse.json(
        { error: 'Chat is not active' },
        { status: 400 }
      )
    }

    // Insert message as fictional user
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_type: 'fictional',
        content: content.trim(),
        handled_by_operator_id: user.id,
        is_free_message: false
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error inserting message:', messageError)
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }

    // Update chat last_message_at timestamp
    const { error: updateError } = await supabase
      .from('chats')
      .update({ 
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', chatId)

    if (updateError) {
      console.error('Error updating chat timestamp:', updateError)
    }

    // Update operator stats - increment total_messages
    const { data: operatorData } = await supabase
      .from('operators')
      .select('total_messages')
      .eq('id', user.id)
      .single()

    if (operatorData) {
      const { error: statsError } = await supabase
        .from('operators')
        .update({ 
          total_messages: operatorData.total_messages + 1,
          last_activity: new Date().toISOString()
        })
        .eq('id', user.id)

      if (statsError) {
        console.error('Error updating operator stats:', statsError)
      }
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in operator message route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
