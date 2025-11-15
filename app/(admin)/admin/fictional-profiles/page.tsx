'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { GlassCard } from '@/components/shared/GlassCard'
import { GlassButton } from '@/components/shared/GlassButton'
import { GlassInput } from '@/components/shared/GlassInput'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Modal } from '@/components/shared/Modal'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { FictionalUser } from '@/types/database'
import { FictionalProfileCard } from '@/components/admin/FictionalProfileCard'
import { FictionalProfileForm } from '@/components/admin/FictionalProfileForm'

export default function FictionalProfilesPage() {
  const [profiles, setProfiles] = useState<FictionalUser[]>([])
  const [filteredProfiles, setFilteredProfiles] = useState<FictionalUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<FictionalUser | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchProfiles()
  }, [])

  useEffect(() => {
    filterProfiles()
  }, [profiles, searchQuery, genderFilter, statusFilter])

  const fetchProfiles = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('fictional_users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setProfiles(data || [])
    } catch (error: any) {
      toast.error('Failed to load profiles: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filterProfiles = () => {
    let filtered = [...profiles]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (profile) =>
          profile.name.toLowerCase().includes(query) ||
          profile.location.toLowerCase().includes(query)
      )
    }

    // Gender filter
    if (genderFilter !== 'all') {
      filtered = filtered.filter((profile) => profile.gender === genderFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((profile) =>
        statusFilter === 'active' ? profile.is_active : !profile.is_active
      )
    }

    setFilteredProfiles(filtered)
  }

  const handleCreateProfile = () => {
    setEditingProfile(null)
    setIsCreateModalOpen(true)
  }

  const handleEditProfile = (profile: FictionalUser) => {
    setEditingProfile(profile)
    setIsCreateModalOpen(true)
  }

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Are you sure you want to deactivate this profile?')) return

    try {
      const { error } = await supabase
        .from('fictional_users')
        .update({ is_active: false })
        .eq('id', profileId)

      if (error) throw error

      toast.success('Profile deactivated successfully')
      fetchProfiles()
    } catch (error: any) {
      toast.error('Failed to deactivate profile: ' + error.message)
    }
  }

  const handleActivateProfile = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('fictional_users')
        .update({ is_active: true })
        .eq('id', profileId)

      if (error) throw error

      toast.success('Profile activated successfully')
      fetchProfiles()
    } catch (error: any) {
      toast.error('Failed to activate profile: ' + error.message)
    }
  }

  const handleFormSuccess = () => {
    setIsCreateModalOpen(false)
    setEditingProfile(null)
    fetchProfiles()
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-50 mb-2">Fictional Profiles</h1>
          <p className="text-gray-400">Manage fictional user profiles for the platform</p>
        </div>

        {/* Filters and Actions */}
        <GlassCard className="p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <GlassInput
                type="text"
                placeholder="Search by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Gender Filter */}
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as any)}
              className="px-4 py-2 bg-glass-light border border-white/10 rounded-glass-sm text-gray-300 focus:outline-none focus:border-primary-red"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 bg-glass-light border border-white/10 rounded-glass-sm text-gray-300 focus:outline-none focus:border-primary-red"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Create Button */}
            <GlassButton onClick={handleCreateProfile} className="whitespace-nowrap">
              + Create Profile
            </GlassButton>
          </div>

          {/* Stats */}
          <div className="mt-4 flex gap-6 text-sm">
            <div className="text-gray-400">
              Total: <span className="text-gray-200 font-medium">{profiles.length}</span>
            </div>
            <div className="text-gray-400">
              Active:{' '}
              <span className="text-green-400 font-medium">
                {profiles.filter((p) => p.is_active).length}
              </span>
            </div>
            <div className="text-gray-400">
              Inactive:{' '}
              <span className="text-red-400 font-medium">
                {profiles.filter((p) => !p.is_active).length}
              </span>
            </div>
            <div className="text-gray-400">
              Showing: <span className="text-gray-200 font-medium">{filteredProfiles.length}</span>
            </div>
          </div>
        </GlassCard>

        {/* Profiles Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner />
          </div>
        ) : filteredProfiles.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              {searchQuery || genderFilter !== 'all' || statusFilter !== 'all'
                ? 'No profiles match your filters'
                : 'No fictional profiles yet'}
            </div>
            {!searchQuery && genderFilter === 'all' && statusFilter === 'all' && (
              <GlassButton onClick={handleCreateProfile}>Create First Profile</GlassButton>
            )}
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile) => (
              <FictionalProfileCard
                key={profile.id}
                profile={profile}
                onEdit={handleEditProfile}
                onDelete={handleDeleteProfile}
                onActivate={handleActivateProfile}
              />
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false)
            setEditingProfile(null)
          }}
        >
          <FictionalProfileForm
            profile={editingProfile}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setIsCreateModalOpen(false)
              setEditingProfile(null)
            }}
          />
        </Modal>
      </div>
    </AdminLayout>
  )
}
