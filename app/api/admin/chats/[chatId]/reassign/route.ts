import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is an admin
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .single()

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { operatorId, reason } = await request.json()

    if (!operatorId) {
      return NextResponse.json({ error: 'Operator ID is required' }, { status: 400 })
    }

    // Get current chat details
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*, operator:operators(*)')
      .eq('id', params.chatId)
      .single()

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    // Verify new operator exists and is active
    const { data: newOperator, error: operatorError } = await supabase
      .from('operators')
      .select('*')
      .eq('id', operatorId)
      .single()

    if (operatorError || !newOperator) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 404 })
    }

    if (!newOperator.is_active) {
      return NextResponse.json({ error: 'Operator is not active' }, { status: 400 })
    }

    const previousOperatorId = chat.assigned_operator_id

    // Log the current assignment as released
    if (previousOperatorId) {
      const { error: logReleaseError } = await supabase
        .from('chat_assignments')
        .insert({
          chat_id: params.chatId,
          operator_id: previousOperatorId,
          assigned_at: chat.assignment_time,
          released_at: new Date().toISOString(),
          release_reason: `manual_reassignment_by_admin:${reason || 'no_reason'}`,
        })

      if (logReleaseError) {
        console.error('Failed to log assignment release:', logReleaseError)
      }
    }

    // Update chat with new operator
    const { error: updateError } = await supabase
      .from('chats')
      .update({
        assigned_operator_id: operatorId,
        assignment_time: new Date().toISOString(),
        chat_state: 'assigned', // Set to assigned state
        last_operator_id: operatorId, // Track for same-operator prevention
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.chatId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to reassign chat: ' + updateError.message },
        { status: 500 }
      )
    }

    // Log the new assignment
    const { error: logAssignError } = await supabase
      .from('chat_assignments')
      .insert({
        chat_id: params.chatId,
        operator_id: operatorId,
        assigned_at: new Date().toISOString(),
      })

    if (logAssignError) {
      console.error('Failed to log new assignment:', logAssignError)
    }

    // Note: In a production system, you would send real-time notifications
    // to both operators here using Supabase Realtime or a notification service

    return NextResponse.json(
      {
        success: true,
        message: 'Chat reassigned successfully',
        previousOperator: chat.operator?.name || 'None',
        newOperator: newOperator.name,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error reassigning chat:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}
