import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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

    const { chatId, notesField, notes } = await request.json()

    // Validate input
    if (!chatId || !notesField || typeof notes !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    if (notesField !== 'real_profile_notes' && notesField !== 'fictional_profile_notes') {
      return NextResponse.json(
        { error: 'Invalid notes field' },
        { status: 400 }
      )
    }

    // Verify operator is assigned to this chat (or was assigned - allow saving even if chat is closed)
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('assigned_operator_id, is_active')
      .eq('id', chatId)
      .single()

    if (chatError || !chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      )
    }

    // Allow saving notes if operator was assigned to this chat (even if chat is now inactive)
    // This allows operators to save notes after chat completion
    if (chat.assigned_operator_id !== user.id) {
      // Check if user is an admin (admins can edit any notes)
      const { data: adminCheck } = await supabase
        .from('admins')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!adminCheck) {
        return NextResponse.json(
          { error: 'Not authorized to edit notes for this chat' },
          { status: 403 }
        )
      }
    }

    // Update notes - this works regardless of chat status
    const { error: updateError } = await supabase
      .from('chats')
      .update({ [notesField]: notes })
      .eq('id', chatId)

    if (updateError) {
      console.error('Error updating notes:', updateError)
      return NextResponse.json(
        { error: 'Failed to save notes' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Notes saved successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Notes save error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

