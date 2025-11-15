import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/config - Get all platform configuration
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Verify admin authentication
    const { data: { user } } = await supabase.auth.getUser()
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

    // Fetch all configuration
    const { data: config, error } = await supabase
      .from('platform_config')
      .select('*')
      .order('key')

    if (error) {
      console.error('Error fetching config:', error)
      return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 })
    }

    // Transform to key-value object
    const configObject = config.reduce((acc: Record<string, any>, item: any) => {
      acc[item.key] = {
        value: item.value,
        description: item.description,
        updated_at: item.updated_at,
        updated_by: item.updated_by
      }
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({ config: configObject })
  } catch (error) {
    console.error('Error in GET /api/admin/config:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/config - Update platform configuration
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    
    // Verify admin authentication
    const { data: { user } } = await supabase.auth.getUser()
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

    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 })
    }

    // Validate specific configuration values
    if (key === 'idle_timeout_minutes') {
      const timeout = parseInt(value)
      if (isNaN(timeout) || timeout < 1 || timeout > 30) {
        return NextResponse.json(
          { error: 'Idle timeout must be between 1 and 30 minutes' },
          { status: 400 }
        )
      }
    }

    if (key === 'max_reassignments') {
      const max = parseInt(value)
      if (isNaN(max) || max < 1 || max > 10) {
        return NextResponse.json(
          { error: 'Max reassignments must be between 1 and 10' },
          { status: 400 }
        )
      }
    }

    if (key === 'free_message_count') {
      const count = parseInt(value)
      if (isNaN(count) || count < 0 || count > 10) {
        return NextResponse.json(
          { error: 'Free message count must be between 0 and 10' },
          { status: 400 }
        )
      }
    }

    if (key === 'credit_price_kes') {
      const price = parseFloat(value)
      if (isNaN(price) || price < 1 || price > 1000) {
        return NextResponse.json(
          { error: 'Credit price must be between 1 and 1000 KES' },
          { status: 400 }
        )
      }
    }

    if (key === 'maintenance_mode') {
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        return NextResponse.json(
          { error: 'Maintenance mode must be a boolean value' },
          { status: 400 }
        )
      }
    }

    // Update configuration
    const { error: updateError } = await supabase
      .from('platform_config')
      .update({
        value: value,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('key', key)

    if (updateError) {
      console.error('Error updating config:', updateError)
      return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 })
    }

    // Fetch updated configuration
    const { data: updatedConfig } = await supabase
      .from('platform_config')
      .select('*')
      .eq('key', key)
      .single()

    return NextResponse.json({ 
      message: 'Configuration updated successfully',
      config: updatedConfig
    })
  } catch (error) {
    console.error('Error in PUT /api/admin/config:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
