import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { reference } = await request.json()

    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 })
    }

    // Verify payment with Paystack
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!verifyResponse.ok) {
      console.error('Paystack verification failed:', await verifyResponse.text())
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    const verifyData = await verifyResponse.json()

    if (!verifyData.status || verifyData.data.status !== 'success') {
      return NextResponse.json({ error: 'Payment was not successful' }, { status: 400 })
    }

    const { metadata, amount } = verifyData.data
    const { user_id, credits } = metadata

    if (!user_id || !credits) {
      return NextResponse.json({ error: 'Invalid payment metadata' }, { status: 400 })
    }

    // Check if transaction already exists
    const { data: existingTransaction } = await supabase
      .from('transactions')
      .select('id')
      .eq('paystack_reference', reference)
      .single()

    if (existingTransaction) {
      // Transaction already processed
      return NextResponse.json({ success: true, message: 'Transaction already processed' })
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        real_user_id: user_id,
        amount: amount / 100, // Convert from kobo to KES
        credits_purchased: credits,
        paystack_reference: reference,
        status: 'success',
        completed_at: new Date().toISOString()
      })

    if (transactionError) {
      console.error('Error creating transaction:', transactionError)
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
    }

    // Add credits to user balance
    const { data: user, error: fetchError } = await supabase
      .from('real_users')
      .select('credits')
      .eq('id', user_id)
      .single()

    if (fetchError) {
      console.error('Error fetching user:', fetchError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('real_users')
      .update({ credits: (user?.credits || 0) + credits })
      .eq('id', user_id)

    if (updateError) {
      console.error('Error updating credits:', updateError)
      return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 })
    }

    console.log(`Successfully verified and added ${credits} credits to user ${user_id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
