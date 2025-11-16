'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { cn } from '@/lib/utils/cn'

interface DashboardLayoutProps {
  children: ReactNode
}

const navItems = [
  { href: '/discover', label: 'Discover', icon: '🔍' },
  { href: '/chats', label: 'Chats', icon: '💬' },
  { href: '/favorites', label: 'Favorites', icon: '❤️' },
  { href: '/credits', label: 'Credits', icon: '💳' },
  { href: '/me', label: 'Profile', icon: '👤' },
]

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-primary-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-primary-bg/80 backdrop-blur-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/discover" className="text-2xl font-bold text-primary-red">
              Fantooo
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-glass-sm transition-all',
                    'hover:bg-glass-light',
                    pathname?.startsWith(item.href)
                      ? 'text-primary-red bg-glass-light'
                      : 'text-gray-300'
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-glass-sm transition-all text-gray-300 hover:bg-glass-light hover:text-white"
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-gray-300 hover:text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <nav className="md:hidden py-4 border-t border-white/10">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-glass-sm transition-all',
                    'hover:bg-glass-light',
                    pathname?.startsWith(item.href)
                      ? 'text-primary-red bg-glass-light'
                      : 'text-gray-300'
                  )}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-glass-sm transition-all text-gray-300 hover:bg-glass-light hover:text-white"
              >
                <span className="text-xl">🚪</span>
                <span>Logout</span>
              </button>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
