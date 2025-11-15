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
    const { name, email } = await request.json()

    // Validate input
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
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

    // Generate a secure random password
    const generatePassword = () => {
      const length = 12
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
      let password = ''
      
      // Ensure at least one of each required character type
      password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
      password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
      password += '0123456789'[Math.floor(Math.random() * 10)]
      password += '!@#$%^&*'[Math.floor(Math.random() * 8)]
      
      // Fill the rest randomly
      for (let i = password.length; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)]
      }
      
      // Shuffle the password
      return password.split('').sort(() => Math.random() - 0.5).join('')
    }

    const temporaryPassword = generatePassword()

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
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

    // Send email with login credentials
    // Note: In production, you should use a proper email service
    // For now, we'll use Supabase's built-in email functionality
    try {
      // Send a password reset email instead of sending the password directly
      // This is more secure as the operator will set their own password
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/op-login`,
        },
      })

      // In a production environment, you would send a custom email here
      // with the login instructions and the magic link
      console.log('Login credentials for operator:', {
        email,
        temporaryPassword,
        note: 'In production, send this via email service',
      })
    } catch (emailError) {
      console.error('Email sending error:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json(
      {
        message: 'Operator created successfully',
        operator,
        // In development, return the password so admin can share it
        // Remove this in production
        ...(process.env.NODE_ENV === 'development' && { temporaryPassword }),
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
