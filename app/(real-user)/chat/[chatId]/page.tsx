import { redirect } from 'next/navigation'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ChatInterface } from '@/components/real-user/ChatInterface'

export default async function ChatPage({ params }: { params: { chatId: string } }) {
  const supabase = await createServerClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/get-started')
  }

  // Fetch chat details
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select(`
      *,
      fictional_user:fictional_users(*)
    `)
    .eq('id', params.chatId)
    .eq('real_user_id', user.id)
    .single()

  if (chatError || !chat) {
    redirect('/discover')
  }

  // Fetch messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', params.chatId)
    .order('created_at', { ascending: true })

  // Fetch user credits
  const { data: realUser } = await supabase
    .from('real_users')
    .select('credits')
    .eq('id', user.id)
    .single()

  return (
    <div className="h-screen flex flex-col bg-[#0F0F23]">
      {/* Chat Header */}
      <div className="bg-[#1A1A2E]/80 backdrop-blur-sm border-b border-gray-700/50 p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <a
            href="/discover"
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            ← Back
          </a>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-50">
              {chat.fictional_user.name}
            </h1>
            <p className="text-sm text-gray-400">
              {chat.fictional_user.age} • {chat.fictional_user.location}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          chatId={params.chatId}
          fictionalUserId={chat.fictional_user_id}
          currentUserId={user.id}
          initialMessages={messages || []}
          initialCredits={realUser?.credits || 0}
          initialMessageCount={chat.message_count || 0}
        />
      </div>
    </div>
  )
}
