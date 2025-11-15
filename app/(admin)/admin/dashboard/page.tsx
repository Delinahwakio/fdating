'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface DashboardStats {
  totalUsers: number
  activeChats: number
  totalOperators: number
  availableOperators: number
  totalProfiles: number
  activeProfiles: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      const [usersRes, chatsRes, operatorsRes, profilesRes] = await Promise.all([
        supabase.from('real_users').select('id', { count: 'exact', head: true }),
        supabase.from('chats').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('operators').select('id, is_available', { count: 'exact' }),
        supabase.from('fictional_users').select('id, is_active', { count: 'exact' }),
      ])

      const availableOps = operatorsRes.data?.filter(op => op.is_available).length || 0
      const activeProfs = profilesRes.data?.filter(prof => prof.is_active).length || 0

      setStats({
        totalUsers: usersRes.count || 0,
        activeChats: chatsRes.count || 0,
        totalOperators: operatorsRes.count || 0,
        availableOperators: availableOps,
        totalProfiles: profilesRes.count || 0,
        activeProfiles: activeProfs,
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickLinks = [
    { href: '/admin/chats', label: 'Monitor Chats', icon: '💬', description: 'View and manage active conversations' },
    { href: '/admin/fictional-profiles', label: 'Manage Profiles', icon: '👥', description: 'Create and edit fictional profiles' },
    { href: '/admin/operators', label: 'Manage Operators', icon: '🎧', description: 'Add and manage operator accounts' },
    { href: '/admin/real-users', label: 'User Moderation', icon: '👤', description: 'Moderate and manage real users' },
    { href: '/admin/stats', label: 'Analytics', icon: '📈', description: 'View detailed platform analytics' },
    { href: '/admin/settings', label: 'Settings', icon: '⚙️', description: 'Configure platform settings' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-red"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">Welcome back! Here's what's happening on your platform.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-glass-light border border-white/10 rounded-glass-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-4xl">👤</span>
            <span className="text-sm text-gray-400">Total</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats?.totalUsers || 0}</div>
          <div className="text-sm text-gray-400">Real Users</div>
        </div>

        <div className="bg-glass-light border border-white/10 rounded-glass-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-4xl">💬</span>
            <span className="text-sm text-gray-400">Active</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats?.activeChats || 0}</div>
          <div className="text-sm text-gray-400">Active Chats</div>
        </div>

        <div className="bg-glass-light border border-white/10 rounded-glass-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-4xl">🎧</span>
            <span className="text-sm text-green-400">{stats?.availableOperators || 0} available</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats?.totalOperators || 0}</div>
          <div className="text-sm text-gray-400">Operators</div>
        </div>

        <div className="bg-glass-light border border-white/10 rounded-glass-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-4xl">👥</span>
            <span className="text-sm text-green-400">{stats?.activeProfiles || 0} active</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats?.totalProfiles || 0}</div>
          <div className="text-sm text-gray-400">Fictional Profiles</div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-glass-light border border-white/10 rounded-glass-lg p-6 hover:bg-glass transition-all group"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{link.icon}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-primary-red transition-colors">
                    {link.label}
                  </h3>
                  <p className="text-sm text-gray-400">{link.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
