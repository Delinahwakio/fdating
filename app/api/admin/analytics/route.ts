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
    const dateRange = searchParams.get('dateRange') || 'month'

    // Calculate date filter
    let dateFilter: string
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
        // Default to last 30 days
        const defaultDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        dateFilter = defaultDate.toISOString()
    }

    // Fetch user growth data
    const { data: users } = await supabase
      .from('real_users')
      .select('created_at')
      .gte('created_at', dateFilter)
      .order('created_at', { ascending: true })

    // Fetch message volume data
    const { data: messages } = await supabase
      .from('messages')
      .select('created_at')
      .gte('created_at', dateFilter)
      .order('created_at', { ascending: true })

    // Fetch revenue data
    const { data: transactions } = await supabase
      .from('transactions')
      .select('created_at, amount')
      .eq('status', 'success')
      .gte('created_at', dateFilter)
      .order('created_at', { ascending: true })

    // Process user growth data
    const usersByDate = new Map<string, number>()
    users?.forEach((user: any) => {
      const date = new Date(user.created_at).toISOString().split('T')[0]
      usersByDate.set(date, (usersByDate.get(date) || 0) + 1)
    })

    // Get all users for cumulative count
    const { data: allUsers } = await supabase
      .from('real_users')
      .select('created_at')
      .order('created_at', { ascending: true })

    // Calculate cumulative users by date
    const cumulativeByDate = new Map<string, number>()
    let cumulative = 0
    allUsers?.forEach((user: any) => {
      const date = new Date(user.created_at).toISOString().split('T')[0]
      cumulative++
      cumulativeByDate.set(date, cumulative)
    })

    // Generate date range
    const dates: string[] = []
    const startDate = new Date(dateFilter)
    const endDate = new Date()

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0])
    }

    // Build user growth array
    const userGrowth = dates.map((date) => {
      // Get cumulative count up to this date
      let cumulativeCount = 0
      const entries = Array.from(cumulativeByDate.entries())
      for (const [d, count] of entries) {
        if (d <= date) {
          cumulativeCount = count
        } else {
          break
        }
      }

      return {
        date,
        users: usersByDate.get(date) || 0,
        cumulative: cumulativeCount,
      }
    })

    // Process message volume data
    const messagesByDate = new Map<string, number>()
    messages?.forEach((message: any) => {
      const date = new Date(message.created_at).toISOString().split('T')[0]
      messagesByDate.set(date, (messagesByDate.get(date) || 0) + 1)
    })

    const messageVolume = dates.map((date) => ({
      date,
      messages: messagesByDate.get(date) || 0,
    }))

    // Process revenue trends data
    const revenueByDate = new Map<string, { revenue: number; transactions: number }>()
    transactions?.forEach((transaction: any) => {
      const date = new Date(transaction.created_at).toISOString().split('T')[0]
      const existing = revenueByDate.get(date) || { revenue: 0, transactions: 0 }
      revenueByDate.set(date, {
        revenue: existing.revenue + Number(transaction.amount),
        transactions: existing.transactions + 1,
      })
    })

    const revenueTrends = dates.map((date) => {
      const data = revenueByDate.get(date) || { revenue: 0, transactions: 0 }
      return {
        date,
        revenue: data.revenue,
        transactions: data.transactions,
      }
    })

    return NextResponse.json({
      userGrowth,
      messageVolume,
      revenueTrends,
    })
  } catch (error) {
    console.error('Error fetching analytics data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}
