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

    // Parse request body
    const { isAvailable } = await request.json()

    if (typeof isAvailable !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid availability value' },
        { status: 400 }
      )
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

    // Check if operator is active
    if (!operator.is_active) {
      return NextResponse.json(
        { error: 'Operator account is not active' },
        { status: 403 }
      )
    }

    // If toggling off, check for active assignments
    if (!isAvailable && operator.is_available) {
      // Check if operator has active chat assignments
      const { data: activeChats, error: chatsError } = await supabase
        .from('chats')
        .select('id')
        .eq('assigned_operator_id', user.id)
        .eq('is_active', true)

      if (chatsError) {
        console.error('Error checking active chats:', chatsError)
        return NextResponse.json(
          { error: 'Failed to check active assignments' },
          { status: 500 }
        )
      }

      // Note: We allow toggling off even with active chats
      // The operator maintains current assignments but won't receive new ones
      if (activeChats && activeChats.length > 0) {
        console.log(
          `Operator ${user.id} toggling off with ${activeChats.length} active chat(s)`
        )
      }
    }

    // Update operator availability
    const { error: updateError } = await supabase
      .from('operators')
      .update({
        is_available: isAvailable,
        last_activity: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating availability:', updateError)
      return NextResponse.json(
        { error: 'Failed to update availability' },
        { status: 500 }
      )
    }

    // If toggling on, attempt to assign a chat immediately
    let assignedChat = null
    if (isAvailable) {
      try {
        const { data: chatId } = await supabase.rpc('assign_chat_to_operator', {
          p_operator_id: user.id
        })

        if (chatId) {
          // Fetch chat details
          const { data: chatDetails } = await supabase
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

          assignedChat = chatDetails
        }
      } catch (assignError) {
        // Log but don't fail the availability toggle
        console.error('Error during auto-assignment:', assignError)
      }
    }

    return NextResponse.json(
      {
        message: 'Availability updated successfully',
        isAvailable,
        assignedChat
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error updating availability:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
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

    // Get operator availability status
    const { data: operator, error: operatorError } = await supabase
      .from('operators')
      .select('is_available, is_active')
      .eq('id', user.id)
      .single()

    if (operatorError || !operator) {
      return NextResponse.json(
        { error: 'Operator not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        isAvailable: operator.is_available,
        isActive: operator.is_active
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error fetching availability:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
