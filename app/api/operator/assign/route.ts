import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRateLimit, RateLimitConfigs } from '@/lib/utils/rateLimit'
import { errorHandler, ErrorTypes, assertExists } from '@/lib/utils/errors'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw ErrorTypes.UNAUTHORIZED()
    }

    // Apply rate limiting (10 requests per minute for assignment)
    await withRateLimit(request, RateLimitConfigs.STRICT, user.id)

    // Verify user is an operator
    const { data: operator, error: operatorError } = await supabase
      .from('operators')
      .select('id, is_active, is_available')
      .eq('id', user.id)
      .single()

    if (operatorError) {
      throw ErrorTypes.DATABASE_ERROR('Failed to fetch operator')
    }
    
    assertExists(operator, 'Operator')

    // Check if operator is active and available
    if (!operator.is_active) {
      throw ErrorTypes.FORBIDDEN('Operator account is not active')
    }

    if (!operator.is_available) {
      throw ErrorTypes.VALIDATION_ERROR('Operator is not available for assignments')
    }

    // Call the database function to assign a chat
    const { data: chatId, error: assignError } = await supabase.rpc(
      'assign_chat_to_operator',
      { p_operator_id: user.id }
    )

    if (assignError) {
      console.error('Assignment error:', assignError)
      
      // Handle specific error cases
      if (assignError.message.includes('already has an active assignment')) {
        throw ErrorTypes.CONFLICT('You already have an active chat assignment')
      }

      throw ErrorTypes.DATABASE_ERROR('Failed to assign chat')
    }

    // If no chat was assigned (queue is empty)
    if (!chatId) {
      return NextResponse.json(
        { message: 'No chats waiting', chat: null },
        { status: 200 }
      )
    }

    // Fetch full chat details with real user and fictional user data
    const { data: chatDetails, error: detailsError } = await supabase
      .from('chats')
      .select(
        `
        id,
        created_at,
        message_count,
        last_message_at,
        real_profile_notes,
        fictional_profile_notes,
        real_user:real_users (
          id,
          name,
          display_name,
          age,
          gender,
          location,
          profile_picture
        ),
        fictional_user:fictional_users (
          id,
          name,
          age,
          gender,
          location,
          bio,
          profile_pictures
        )
      `
      )
      .eq('id', chatId)
      .single()

    if (detailsError) {
      throw ErrorTypes.DATABASE_ERROR('Failed to fetch chat details')
    }

    // Return the assigned chat with full details
    return NextResponse.json(
      {
        message: 'Chat assigned successfully',
        chat: chatDetails
      },
      { status: 200 }
    )
  } catch (error) {
    return errorHandler(error)
  }
}
