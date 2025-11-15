import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is an operator
    const { data: operator, error: operatorError } = await supabase
      .from('operators')
      .select('id, is_active, is_available')
      .eq('id', user.id)
      .single()

    if (operatorError || !operator) {
      return NextResponse.json(
        { error: 'Operator not found' },
        { status: 404 }
      )
    }

    // Check if operator is active and available
    if (!operator.is_active) {
      return NextResponse.json(
        { error: 'Operator account is not active' },
        { status: 403 }
      )
    }

    if (!operator.is_available) {
      return NextResponse.json(
        { error: 'Operator is not available for assignments' },
        { status: 400 }
      )
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
        return NextResponse.json(
          { error: 'You already have an active chat assignment' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to assign chat' },
        { status: 500 }
      )
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
      console.error('Error fetching chat details:', detailsError)
      return NextResponse.json(
        { error: 'Failed to fetch chat details' },
        { status: 500 }
      )
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
    console.error('Unexpected error in assignment:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
