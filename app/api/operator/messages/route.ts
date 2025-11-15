import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { withRateLimit, RateLimitConfigs } from '@/lib/utils/rateLimit'
import { errorHandler, ErrorTypes, assertExists } from '@/lib/utils/errors'
import { validateAndSanitizeMessage } from '@/lib/utils/validation'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw ErrorTypes.UNAUTHORIZED()
    }

    // Apply rate limiting (30 messages per minute)
    await withRateLimit(request, RateLimitConfigs.MESSAGE, user.id)

    const { chatId, content } = await request.json()

    // Validate input
    if (!chatId || !content) {
      throw ErrorTypes.VALIDATION_ERROR('Missing required fields: chatId or content')
    }

    // Validate and sanitize message content
    const validation = validateAndSanitizeMessage(content)
    if (!validation.isValid) {
      throw ErrorTypes.VALIDATION_ERROR(validation.error!)
    }

    const trimmedContent = validation.sanitized!

    // Verify operator is assigned to this chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('assigned_operator_id, is_active')
      .eq('id', chatId)
      .single()

    if (chatError) {
      throw ErrorTypes.DATABASE_ERROR('Failed to fetch chat')
    }
    
    assertExists(chat, 'Chat')

    if (chat.assigned_operator_id !== user.id) {
      throw ErrorTypes.FORBIDDEN('You are not assigned to this chat')
    }

    if (!chat.is_active) {
      throw ErrorTypes.VALIDATION_ERROR('Chat is not active')
    }

    // Insert message as fictional user
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_type: 'fictional',
        content: trimmedContent,
        handled_by_operator_id: user.id,
        is_free_message: false
      })
      .select()
      .single()

    if (messageError) {
      throw ErrorTypes.DATABASE_ERROR('Failed to send message')
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
    return errorHandler(error)
  }
}
