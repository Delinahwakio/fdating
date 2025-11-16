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

    // After operator sends message, mark chat as waiting for real user reply
    // This prevents the chat from being reassigned until real user responds
    const { error: updateError } = await supabase
      .from('chats')
      .update({ 
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        chat_state: 'waiting_real_user_reply', // Mark as waiting for real user
        operator_replied_at: new Date().toISOString(), // Track when operator replied
        assigned_operator_id: null, // Unassign so operator can get new chats
        assignment_time: null
      })
      .eq('id', chatId)

    if (updateError) {
      console.error('Error updating chat:', updateError)
    } else {
      // Log the release - operator finished their turn
      await supabase
        .from('chat_assignments')
        .update({
          released_at: new Date().toISOString(),
          release_reason: 'operator_sent_message'
        })
        .eq('chat_id', chatId)
        .eq('operator_id', user.id)
        .is('released_at', null)

      // Remove operator activity record since chat is no longer assigned
      await supabase
        .from('operator_activity')
        .delete()
        .eq('chat_id', chatId)
        .eq('operator_id', user.id)
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
