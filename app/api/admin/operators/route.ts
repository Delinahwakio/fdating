import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existingOperator } = await supabaseAdmin
      .from('operators')
      .select('id')
      .eq('email', email)
      .single()

    if (existingOperator) {
      return NextResponse.json(
        { error: 'An operator with this email already exists' },
        { status: 409 }
      )
    }

    // Create auth user with provided password
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: 'operator',
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Failed to create operator account: ' + authError.message },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create operator account' },
        { status: 500 }
      )
    }

    // Get current admin user (for created_by field)
    // In a real implementation, you would get this from the session
    // For now, we'll leave it as null
    const createdBy = null

    // Create operator record
    const { data: operator, error: operatorError } = await supabaseAdmin
      .from('operators')
      .insert({
        id: authData.user.id,
        name,
        email,
        is_active: true,
        is_available: false,
        created_by: createdBy,
      })
      .select()
      .single()

    if (operatorError) {
      console.error('Operator creation error:', operatorError)
      
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json(
        { error: 'Failed to create operator record: ' + operatorError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Operator created successfully',
        operator,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + error.message },
      { status: 500 }
    )
  }
}
