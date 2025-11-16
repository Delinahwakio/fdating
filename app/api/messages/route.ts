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

    const { chatId, content, senderId } = await request.json()

    // Validate input
    if (!chatId || !content || !senderId) {
      throw ErrorTypes.VALIDATION_ERROR('Missing required fields: chatId, content, or senderId')
    }

    if (senderId !== user.id) {
      throw ErrorTypes.FORBIDDEN('You can only send messages as yourself')
    }

    // Validate and sanitize message content
    const validation = validateAndSanitizeMessage(content)
    if (!validation.isValid) {
      throw ErrorTypes.VALIDATION_ERROR(validation.error!)
    }

    const trimmedContent = validation.sanitized!

    // Verify chat belongs to user
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id, real_user_id, message_count')
      .eq('id', chatId)
      .eq('real_user_id', senderId)
      .single()

    if (chatError) {
      throw ErrorTypes.DATABASE_ERROR('Failed to fetch chat')
    }
    
    assertExists(chat, 'Chat')

    // Get free message count from configuration
    const { data: freeMessageConfig } = await supabase
      .from('platform_config')
      .select('value')
      .eq('key', 'free_message_count')
      .single()

    const freeMessageCount = freeMessageConfig?.value ? parseInt(freeMessageConfig.value) : 3

    // Get message count for this chat (count messages sent by real user)
    const { count: messageCount, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', chatId)
      .eq('sender_type', 'real')

    if (countError) {
      throw ErrorTypes.DATABASE_ERROR('Failed to check message count')
    }

    const currentMessageCount = messageCount || 0
    const isFreeMessage = currentMessageCount < freeMessageCount

    // If not free, check and deduct credits
    if (!isFreeMessage) {
      const { data: realUser, error: userError } = await supabase
        .from('real_users')
        .select('credits')
        .eq('id', senderId)
        .single()

      if (userError) {
        throw ErrorTypes.DATABASE_ERROR('Failed to fetch user')
      }
      
      assertExists(realUser, 'User')

      if (realUser.credits < 1) {
        throw ErrorTypes.INSUFFICIENT_CREDITS()
      }

      // Deduct credit
      const { error: deductError } = await supabase
        .from('real_users')
        .update({ credits: realUser.credits - 1 })
        .eq('id', senderId)

      if (deductError) {
        throw ErrorTypes.DATABASE_ERROR('Failed to deduct credits')
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
      
      throw ErrorTypes.DATABASE_ERROR('Failed to send message')
    }

    // Handle chat state based on current state
    // Key insight: Don't unassign operator if they're actively working!
    const { data: chatBeforeUpdate } = await supabase
      .from('chats')
      .select('assigned_operator_id, assignment_time, chat_state')
      .eq('id', chatId)
      .single()

    // Determine the correct state transition
    const updateData: any = {
      last_message_at: new Date().toISOString(),
      message_count: currentMessageCount + 1,
      updated_at: new Date().toISOString()
    }

    // State transition logic:
    // 1. If chat is 'waiting_real_user_reply' → change to 'waiting_assignment'
    //    (Operator already replied, user replied back, needs new assignment)
    // 
    // 2. If chat is 'assigned' → KEEP as 'assigned'
    //    (Operator is actively working, let them see the new message)
    //    This handles: User sends "hey", operator gets assigned, user sends "how are you?"
    //    Result: Operator sees both messages in same assignment
    //
    // 3. If chat is 'waiting_assignment' → KEEP as 'waiting_assignment'
    //    (Already waiting for operator)

    if (chatBeforeUpdate?.chat_state === 'waiting_real_user_reply') {
      // Operator already replied, user is replying back
      // Make chat assignable again (may go to different operator)
      updateData.chat_state = 'waiting_assignment'
      
      // Clear assignment if somehow still set
      if (chatBeforeUpdate.assigned_operator_id) {
        updateData.assigned_operator_id = null
        updateData.assignment_time = null
      }
    } else if (chatBeforeUpdate?.chat_state === 'assigned') {
      // Operator is actively working on the chat
      // KEEP the assignment - operator will see the new message
      // DO NOT change chat_state
      // DO NOT unassign operator
      // This is the fix for the concurrent message issue!
    } else if (chatBeforeUpdate?.chat_state === 'waiting_assignment') {
      // Already waiting for assignment, keep waiting
      // DO NOT change chat_state
    }

    const { error: updateError } = await supabase
      .from('chats')
      .update(updateData)
      .eq('id', chatId)

    if (updateError) {
      console.error('Failed to update chat:', updateError)
      // Don't fail the request if chat update fails
    } else if (
      chatBeforeUpdate?.chat_state === 'waiting_real_user_reply' && 
      chatBeforeUpdate?.assigned_operator_id
    ) {
      // Only log release if transitioning from waiting_real_user_reply
      // (This means operator had replied and now user replied back)
      await supabase
        .from('chat_assignments')
        .update({
          released_at: new Date().toISOString(),
          release_reason: 'real_user_replied_after_operator'
        })
        .eq('chat_id', chatId)
        .eq('operator_id', chatBeforeUpdate.assigned_operator_id)
        .is('released_at', null)

      // Remove operator activity record
      await supabase
        .from('operator_activity')
        .delete()
        .eq('chat_id', chatId)
        .eq('operator_id', chatBeforeUpdate.assigned_operator_id)
    }

    // Get updated credits
    const { data: updatedUser } = await supabase
      .from('real_users')
      .select('credits')
      .eq('id', senderId)
      .single()

    return NextResponse.json(
      { 
        message,
        credits_remaining: updatedUser?.credits || 0
      },
      { status: 201 }
    )
  } catch (error) {
    return errorHandler(error)
  }
}
