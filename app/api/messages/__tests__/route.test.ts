import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'

// Mock Supabase server client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

describe('Messages API - Credit Deduction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should send free message for first 3 messages', async () => {
    // Mock authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    // Mock chat lookup
    const chatMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'chat-123', real_user_id: 'user-123', message_count: 2 },
        error: null
      })
    }

    // Mock message count (2 messages sent)
    const countMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis()
    }
    countMock.eq.mockResolvedValue({ count: 2, error: null })

    // Mock message insert
    const insertMock = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'msg-123', content: 'Hello', is_free_message: true },
        error: null
      })
    }

    // Mock chat update
    const updateMock = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null })
    }

    // Mock user credits fetch
    const userMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { credits: 10 },
        error: null
      })
    }

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'chats') return chatMock
      if (table === 'messages') {
        // First call is for count, second is for insert
        const callCount = mockSupabaseClient.from.mock.calls.filter((c: any) => c[0] === 'messages').length
        return callCount === 1 ? countMock : insertMock
      }
      if (table === 'real_users') return userMock
      return {}
    })

    const request = new Request('http://localhost/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: 'chat-123',
        content: 'Hello',
        senderId: 'user-123'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.message.is_free_message).toBe(true)
  })

  it('should deduct credit for 4th message', async () => {
    // Mock authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    // Mock chat lookup
    const chatMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'chat-123', real_user_id: 'user-123', message_count: 3 },
        error: null
      })
    }

    // Mock message count (3 messages sent)
    const countMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis()
    }
    countMock.eq.mockResolvedValue({ count: 3, error: null })

    // Mock user with credits
    const userSelectMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { credits: 10 },
        error: null
      })
    }

    // Mock credit deduction
    const userUpdateMock = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null })
    }

    // Mock message insert
    const insertMock = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'msg-123', content: 'Hello', is_free_message: false },
        error: null
      })
    }

    // Mock chat update
    const chatUpdateMock = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null })
    }

    let fromCallCount = 0
    mockSupabaseClient.from.mockImplementation((table: string) => {
      fromCallCount++
      if (table === 'chats') {
        return fromCallCount === 1 ? chatMock : chatUpdateMock
      }
      if (table === 'messages') {
        return fromCallCount === 2 ? countMock : insertMock
      }
      if (table === 'real_users') {
        return fromCallCount === 3 ? userSelectMock : fromCallCount === 4 ? userUpdateMock : userSelectMock
      }
      return {}
    })

    const request = new Request('http://localhost/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: 'chat-123',
        content: 'Hello',
        senderId: 'user-123'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.message.is_free_message).toBe(false)
    expect(userUpdateMock.update).toHaveBeenCalledWith({ credits: 9 })
  })

  it('should reject message when user has insufficient credits', async () => {
    // Mock authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })

    // Mock chat lookup
    const chatMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'chat-123', real_user_id: 'user-123', message_count: 3 },
        error: null
      })
    }

    // Mock message count (3 messages sent)
    const countMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis()
    }
    countMock.eq.mockResolvedValue({ count: 3, error: null })

    // Mock user with no credits
    const userMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { credits: 0 },
        error: null
      })
    }

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'chats') return chatMock
      if (table === 'messages') return countMock
      if (table === 'real_users') return userMock
      return {}
    })

    const request = new Request('http://localhost/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: 'chat-123',
        content: 'Hello',
        senderId: 'user-123'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(402)
    expect(data.error).toContain('Insufficient credits')
  })
})
