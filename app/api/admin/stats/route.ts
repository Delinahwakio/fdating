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

    // Fetch platform statistics
    const [
      realUsersResult,
      fictionalProfilesResult,
      operatorsResult,
      activeChatsResult,
      transactionsResult,
    ] = await Promise.all([
      // Total real users
      supabase
        .from('real_users')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),

      // Total fictional profiles
      supabase
        .from('fictional_users')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),

      // Total operators
      supabase
        .from('operators')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),

      // Active chats
      supabase
        .from('chats')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),

      // Transactions with date filter
      dateFilter
        ? supabase
            .from('transactions')
            .select('amount, credits_purchased, created_at')
            .eq('status', 'success')
            .gte('created_at', dateFilter)
        : supabase
            .from('transactions')
            .select('amount, credits_purchased, created_at')
            .eq('status', 'success'),
    ])

    // Calculate revenue metrics
    const transactions = transactionsResult.data || []
    const totalRevenue = transactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0)
    const totalCreditsPurchased = transactions.reduce(
      (sum: number, t: any) => sum + t.credits_purchased,
      0
    )

    // Group revenue by date
    const revenueByDateMap = new Map<string, { revenue: number; transactions: number }>()

    transactions.forEach((transaction: any) => {
      const date = new Date(transaction.created_at).toISOString().split('T')[0]
      const existing = revenueByDateMap.get(date) || { revenue: 0, transactions: 0 }
      revenueByDateMap.set(date, {
        revenue: existing.revenue + Number(transaction.amount),
        transactions: existing.transactions + 1,
      })
    })

    // Convert to array and sort by date descending
    const revenueByDate = Array.from(revenueByDateMap.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        transactions: data.transactions,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30) // Limit to 30 most recent days

    const stats = {
      totalRealUsers: realUsersResult.count || 0,
      totalFictionalProfiles: fictionalProfilesResult.count || 0,
      totalOperators: operatorsResult.count || 0,
      activeChats: activeChatsResult.count || 0,
      totalTransactions: transactions.length,
      totalCreditsPurchased,
      totalRevenue,
      revenueByDate,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
