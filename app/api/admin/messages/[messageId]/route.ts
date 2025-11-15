import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: { messageId: string } }
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

    const { content } = await request.json()

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Content must be 5000 characters or less' },
        { status: 400 }
      )
    }

    // Get original message
    const { data: originalMessage, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', params.messageId)
      .single()

    if (fetchError || !originalMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Log the edit
    const { error: logError } = await supabase.from('message_edits').insert({
      message_id: params.messageId,
      admin_id: user.id,
      original_content: originalMessage.content,
      new_content: content,
    })

    if (logError) {
      console.error('Failed to log message edit:', logError)
      // Continue even if logging fails
    }

    // Update the message
    const { data: updatedMessage, error: updateError } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', params.messageId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update message: ' + updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: updatedMessage }, { status: 200 })
  } catch (error: any) {
    console.error('Error editing message:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}
