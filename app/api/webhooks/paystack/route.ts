import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest('hex')

    if (hash !== signature) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)

    // Handle charge.success event
    if (event.event === 'charge.success') {
      const { reference, metadata, amount, status } = event.data
      const { user_id, credits } = metadata

      if (!user_id || !credits) {
        console.error('Missing metadata in webhook:', metadata)
        return NextResponse.json({ error: 'Invalid metadata' }, { status: 400 })
      }

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          real_user_id: user_id,
          amount: amount / 100, // Convert from kobo to KES
          credits_purchased: credits,
          paystack_reference: reference,
          status: status === 'success' ? 'success' : 'failed',
          completed_at: new Date().toISOString()
        })

      if (transactionError) {
        console.error('Error creating transaction:', transactionError)
        return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
      }

      // Add credits to user balance only if payment was successful
      if (status === 'success') {
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

        console.log(`Successfully added ${credits} credits to user ${user_id}`)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
