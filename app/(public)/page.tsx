import Link from 'next/link'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#0F0F23]">
      <GlassCard className="p-8 max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-4">
          Welcome to <span className="text-red-600">Fantooo</span>
        </h1>
        <p className="text-gray-300 text-center mb-8">
          Connect with fictional profiles in real-time conversations
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/get-started">
            <GlassButton className="w-full sm:w-auto">
              Get Started
            </GlassButton>
          </Link>
          <Link href="/op-login">
            <GlassButton variant="secondary" className="w-full sm:w-auto">
              Operator Login
            </GlassButton>
          </Link>
          <Link href="/admin-login">
            <GlassButton variant="secondary" className="w-full sm:w-auto">
              Admin Login
            </GlassButton>
          </Link>
        </div>
      </GlassCard>
    </main>
  )
}
