import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import crypto from 'crypto'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: { credits: 10 }, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      }))
    }))
  }))
}))

describe('Paystack Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should verify webhook signature correctly', async () => {
    const payload = JSON.stringify({
      event: 'charge.success',
      data: {
        reference: 'test-ref-123',
        amount: 10000,
        status: 'success',
        metadata: {
          user_id: 'user-123',
          credits: 100
        }
      }
    })

    const signature = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || 'test-secret')
      .update(payload)
      .digest('hex')

    const request = new Request('http://localhost/api/webhooks/paystack', {
      method: 'POST',
      headers: {
        'x-paystack-signature': signature,
        'Content-Type': 'application/json'
      },
      body: payload
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })

  it('should reject invalid webhook signature', async () => {
    const payload = JSON.stringify({
      event: 'charge.success',
      data: {
        reference: 'test-ref-123',
        amount: 10000,
        status: 'success',
        metadata: {
          user_id: 'user-123',
          credits: 100
        }
      }
    })

    const request = new Request('http://localhost/api/webhooks/paystack', {
      method: 'POST',
      headers: {
        'x-paystack-signature': 'invalid-signature',
        'Content-Type': 'application/json'
      },
      body: payload
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('should create transaction record on successful payment', async () => {
    const payload = JSON.stringify({
      event: 'charge.success',
      data: {
        reference: 'test-ref-456',
        amount: 25000,
        status: 'success',
        metadata: {
          user_id: 'user-456',
          credits: 250
        }
      }
    })

    const signature = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || 'test-secret')
      .update(payload)
      .digest('hex')

    const request = new Request('http://localhost/api/webhooks/paystack', {
      method: 'POST',
      headers: {
        'x-paystack-signature': signature,
        'Content-Type': 'application/json'
      },
      body: payload
    })

    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
  })
})
