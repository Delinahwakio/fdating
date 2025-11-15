import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'

// Mock Supabase server client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(),
  rpc: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

describe('POST /api/operator/assign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    })

    const request = new Request('http://localhost/api/operator/assign', {
      method: 'POST'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 404 if operator not found', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'operator-123' } },
      error: null
    })

    const operatorMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Not found')
      })
    }

    mockSupabaseClient.from.mockReturnValue(operatorMock)

    const request = new Request('http://localhost/api/operator/assign', {
      method: 'POST'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Operator not found')
  })

  it('should return 400 if operator is not available', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'operator-123' } },
      error: null
    })

    const operatorMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'operator-123',
          is_active: true,
          is_available: false
        },
        error: null
      })
    }

    mockSupabaseClient.from.mockReturnValue(operatorMock)

    const request = new Request('http://localhost/api/operator/assign', {
      method: 'POST'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Operator is not available for assignments')
  })

  it('should return 200 with null chat if no chats waiting', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'operator-123' } },
      error: null
    })

    const operatorMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'operator-123',
          is_active: true,
          is_available: true
        },
        error: null
      })
    }

    mockSupabaseClient.from.mockReturnValue(operatorMock)
    mockSupabaseClient.rpc.mockResolvedValue({
      data: null,
      error: null
    })

    const request = new Request('http://localhost/api/operator/assign', {
      method: 'POST'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('No chats waiting')
    expect(data.chat).toBeNull()
  })

  it('should assign chat and return full details on success', async () => {
    const mockChatId = 'chat-123'
    const mockChatDetails = {
      id: mockChatId,
      created_at: '2024-01-01T00:00:00Z',
      message_count: 0,
      last_message_at: '2024-01-01T00:00:00Z',
      real_profile_notes: '',
      fictional_profile_notes: '',
      real_user: {
        id: 'user-123',
        name: 'john',
        display_name: 'John Doe',
        age: 25,
        gender: 'male',
        location: 'Nairobi',
        profile_picture: null
      },
      fictional_user: {
        id: 'fictional-123',
        name: 'Jane',
        age: 24,
        gender: 'female',
        location: 'Mombasa',
        bio: 'Test bio',
        profile_pictures: []
      }
    }

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'operator-123' } },
      error: null
    })

    const operatorMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'operator-123',
          is_active: true,
          is_available: true
        },
        error: null
      })
    }

    const chatMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockChatDetails,
        error: null
      })
    }

    let fromCallCount = 0
    mockSupabaseClient.from.mockImplementation((table: string) => {
      fromCallCount++
      if (table === 'operators') return operatorMock
      if (table === 'chats') return chatMock
      return {}
    })

    mockSupabaseClient.rpc.mockResolvedValue({
      data: mockChatId,
      error: null
    })

    const request = new Request('http://localhost/api/operator/assign', {
      method: 'POST'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Chat assigned successfully')
    expect(data.chat).toEqual(mockChatDetails)
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('assign_chat_to_operator', {
      p_operator_id: 'operator-123'
    })
  })
})
