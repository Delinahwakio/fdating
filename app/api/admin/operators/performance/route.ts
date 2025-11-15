import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Verify admin authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse date range from query params
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || 'all'

    // Calculate date filter
    let dateFilter: string | null = null
    const now = new Date()

    switch (dateRange) {
      case 'today':
        dateFilter = new Date(now.setHours(0, 0, 0, 0)).toISOString()
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        dateFilter = weekAgo.toISOString()
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        dateFilter = monthAgo.toISOString()
        break
      case 'year':
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        dateFilter = yearAgo.toISOString()
        break
      default:
        dateFilter = null
    }

    // Fetch all operators
    const { data: operators, error: operatorsError } = await supabase
      .from('operators')
      .select('id, name, email, is_available, last_activity')
      .eq('is_active', true)

    if (operatorsError) {
      throw operatorsError
    }

    // For each operator, calculate performance metrics
    const operatorPerformance = await Promise.all(
      operators.map(async (operator: any) => {
        // Get messages sent by this operator
        const messagesQuery = supabase
          .from('messages')
          .select('id, created_at', { count: 'exact', head: false })
          .eq('handled_by_operator_id', operator.id)

        if (dateFilter) {
          messagesQuery.gte('created_at', dateFilter)
        }

        const { data: messages, count: messageCount } = await messagesQuery

        // Get chats handled by this operator
        const chatsQuery = supabase
          .from('chat_assignments')
          .select('chat_id', { count: 'exact', head: true })
          .eq('operator_id', operator.id)

        if (dateFilter) {
          chatsQuery.gte('assigned_at', dateFilter)
        }

        const { count: chatsHandled } = await chatsQuery

        // Calculate average response time
        // Get all messages in chats this operator handled
        let averageResponseTime = 0

        if (messages && messages.length > 0) {
          // Get chat IDs for this operator
          const chatAssignmentsQuery = supabase
            .from('chat_assignments')
            .select('chat_id')
            .eq('operator_id', operator.id)

          if (dateFilter) {
            chatAssignmentsQuery.gte('assigned_at', dateFilter)
          }

          const { data: chatAssignments } = await chatAssignmentsQuery

          if (chatAssignments && chatAssignments.length > 0) {
            const chatIds = chatAssignments.map((ca: any) => ca.chat_id)

            // Get all messages in these chats to calculate response times
            const { data: allChatMessages } = await supabase
              .from('messages')
              .select('chat_id, sender_type, created_at')
              .in('chat_id', chatIds)
              .order('created_at', { ascending: true })

            if (allChatMessages && allChatMessages.length > 0) {
              // Group messages by chat
              const messagesByChat = allChatMessages.reduce((acc: any, msg: any) => {
                if (!acc[msg.chat_id]) {
                  acc[msg.chat_id] = []
                }
                acc[msg.chat_id].push(msg)
                return acc
              }, {} as Record<string, any[]>)

              // Calculate response times
              let totalResponseTime = 0
              let responseCount = 0

              const chatMessageArrays = Object.values(messagesByChat) as any[]
              
              for (const chatMessages of chatMessageArrays) {
                if (!Array.isArray(chatMessages)) continue
                
                for (let i = 1; i < chatMessages.length; i++) {
                  const prevMsg = chatMessages[i - 1]
                  const currMsg = chatMessages[i]

                  // If previous was from real user and current is from fictional (operator)
                  if (
                    prevMsg.sender_type === 'real' &&
                    currMsg.sender_type === 'fictional'
                  ) {
                    const prevTime = new Date(prevMsg.created_at).getTime()
                    const currTime = new Date(currMsg.created_at).getTime()
                    const responseTime = currTime - prevTime
                    totalResponseTime += responseTime
                    responseCount++
                  }
                }
              }

              if (responseCount > 0) {
                // Convert to seconds
                averageResponseTime = totalResponseTime / responseCount / 1000
              }
            }
          }
        }

        return {
          id: operator.id,
          name: operator.name,
          email: operator.email,
          totalMessages: messageCount || 0,
          chatsHandled: chatsHandled || 0,
          averageResponseTime,
          isAvailable: operator.is_available,
          lastActivity: operator.last_activity,
        }
      })
    )

    return NextResponse.json({ operators: operatorPerformance })
  } catch (error) {
    console.error('Error fetching operator performance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch operator performance' },
      { status: 500 }
    )
  }
}
