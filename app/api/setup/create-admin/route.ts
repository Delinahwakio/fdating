import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate inputs
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Use Supabase Admin API with service role (bypasses RLS)
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabaseAdminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if admin already exists using service role
    const { data: existingAdmin } = await supabaseAdminClient
      .from('admins')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (existingAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin already exists' },
        { status: 400 }
      );
    }

    // Create user with Supabase Admin API
    const { data: userData, error: userError } = await supabaseAdminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
    });

    if (userError || !userData.user) {
      console.error('Error creating user:', userError);
      return NextResponse.json(
        { success: false, error: userError?.message || 'Failed to create user' },
        { status: 500 }
      );
    }

    // Create admin record using service role (bypasses RLS)
    const { error: adminError } = await supabaseAdminClient
      .from('admins')
      .insert({
        id: userData.user.id,
        name,
        email,
        is_super_admin: true,
      });

    if (adminError) {
      console.error('Error creating admin record:', adminError);
      // Try to delete the user if admin record creation fails
      await supabaseAdminClient.auth.admin.deleteUser(userData.user.id);
      return NextResponse.json(
        { success: false, error: 'Failed to create admin record' },
        { status: 500 }
      );
    }

    // Mark system as initialized using service role
    await supabaseAdminClient
      .from('platform_config')
      .update({ value: 'true' })
      .eq('key', 'system_initialized');

    return NextResponse.json({
      success: true,
      message: 'Admin created successfully',
      data: {
        user_id: userData.user.id,
        email: userData.user.email,
      },
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create admin' },
      { status: 500 }
    );
  }
}
