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

    const { chatId, content, senderId } = await request.json()

    // Validate input
    if (!chatId || !content || !senderId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (senderId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate content length
    const trimmedContent = content.trim()
    if (trimmedContent.length === 0 || trimmedContent.length > 5000) {
      return NextResponse.json(
        { error: 'Message must be between 1 and 5000 characters' },
        { status: 400 }
      )
    }

    // Verify chat belongs to user
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id, real_user_id, message_count')
      .eq('id', chatId)
      .eq('real_user_id', senderId)
      .single()

    if (chatError || !chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      )
    }

    // Get message count for this chat (count messages sent by real user)
    const { count: messageCount, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', chatId)
      .eq('sender_type', 'real')

    if (countError) {
      return NextResponse.json(
        { error: 'Failed to check message count' },
        { status: 500 }
      )
    }

    const currentMessageCount = messageCount || 0
    const isFreeMessage = currentMessageCount < 3

    // If not free, check and deduct credits
    if (!isFreeMessage) {
      const { data: realUser, error: userError } = await supabase
        .from('real_users')
        .select('credits')
        .eq('id', senderId)
        .single()

      if (userError || !realUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      if (realUser.credits < 1) {
        return NextResponse.json(
          { error: 'Insufficient credits. Please purchase more credits to continue chatting.' },
          { status: 402 }
        )
      }

      // Deduct credit
      const { error: deductError } = await supabase
        .from('real_users')
        .update({ credits: realUser.credits - 1 })
        .eq('id', senderId)

      if (deductError) {
        return NextResponse.json(
          { error: 'Failed to deduct credits' },
          { status: 500 }
        )
      }
    }

    // Insert message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_type: 'real',
        content: trimmedContent,
        is_free_message: isFreeMessage,
        delivered_at: new Date().toISOString()
      })
      .select()
      .single()

    if (messageError) {
      // Refund credit if message insertion failed
      if (!isFreeMessage) {
        await supabase
          .from('real_users')
          .update({ credits: (await supabase
            .from('real_users')
            .select('credits')
            .eq('id', senderId)
            .single()).data!.credits + 1 })
          .eq('id', senderId)
      }
      
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }

    // Update chat last_message_at and message_count
    const { error: updateError } = await supabase
      .from('chats')
      .update({
        last_message_at: new Date().toISOString(),
        message_count: currentMessageCount + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', chatId)

    if (updateError) {
      console.error('Failed to update chat:', updateError)
      // Don't fail the request if chat update fails
    }

    return NextResponse.json(
      { 
        message,
        credits_remaining: isFreeMessage 
          ? (await supabase.from('real_users').select('credits').eq('id', senderId).single()).data?.credits 
          : (await supabase.from('real_users').select('credits').eq('id', senderId).single()).data?.credits
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Message API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
