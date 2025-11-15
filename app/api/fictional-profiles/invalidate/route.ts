/**
 * API route for invalidating fictional profiles cache
 * Called when profiles are created, updated, or deleted
 */

import { NextRequest, NextResponse } from 'next/server'
import { invalidateFictionalProfilesCache } from '@/lib/utils/cache'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from an authenticated admin
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is an admin
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Invalidate the cache
    invalidateFictionalProfilesCache()

    return NextResponse.json(
      { message: 'Cache invalidated successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error invalidating cache:', error)
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    )
  }
}
