import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Call the has_admin function
    const { data, error } = await supabase.rpc('has_admin' as any);

    if (error) {
      console.error('Error checking admin existence:', error);
      return NextResponse.json(
        { needsSetup: true, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ needsSetup: !data });
  } catch (error) {
    console.error('Setup check error:', error);
    return NextResponse.json(
      { needsSetup: true, error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
}
