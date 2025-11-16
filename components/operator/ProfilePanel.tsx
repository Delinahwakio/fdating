'use client'

import { FC, useState, useEffect } from 'react'
import Image from 'next/image'
import { RealUser, FictionalUser } from '@/types/database'
import { GlassButton } from '@/components/shared/GlassButton'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface ProfilePanelProps {
  title: string
  profile: RealUser | FictionalUser
  notes: string
  chatId: string
  notesField: 'real_profile_notes' | 'fictional_profile_notes'
}

export const ProfilePanel: FC<ProfilePanelProps> = ({
  title,
  profile,
  notes: initialNotes,
  chatId,
  notesField
}) => {
  const [existingNotes, setExistingNotes] = useState(initialNotes)
  const [newNote, setNewNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  // Update notes when prop changes
  useEffect(() => {
    setExistingNotes(initialNotes)
    setNewNote('')
  }, [initialNotes])

  const isRealUser = 'credits' in profile
  const isFictionalUser = 'bio' in profile

  const handleSaveNewNote = async () => {
    if (!newNote.trim() || isSaving) return
    
    setIsSaving(true)
    try {
      // Format new note with timestamp
      const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      
      const formattedNewNote = `[${timestamp}]\n${newNote.trim()}\n\n`
      
      // Prepend new note to existing notes
      const updatedNotes = formattedNewNote + existingNotes

      // Save notes regardless of chat status - use API route for better control
      const response = await fetch(`/api/operator/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          notesField,
          notes: updatedNotes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save notes')
      }

      toast.success('Note added successfully')
      setExistingNotes(updatedNotes)
      setNewNote('')
    } catch (err: any) {
      console.error('Error saving notes:', err)
      toast.error(err.message || 'Failed to save notes')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden p-6">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 pb-3 border-b border-gray-700/50 mb-4">
        <h2 className="text-xl font-bold text-gray-50">{title}</h2>
      </div>

      {/* Compact Profile Section - Scrollable but compact */}
      <div className="flex-shrink-0 overflow-y-auto space-y-3 mb-4 max-h-[40%]">
        {/* Profile Picture and Basic Info Row */}
        <div className="flex items-start gap-3">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            {isRealUser && profile.profile_picture ? (
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-gray-700/50 shadow-lg">
                <Image
                  src={profile.profile_picture}
                  alt={profile.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMUExQTJFO3N0b3Atb3BhY2l0eTowLjgiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMUExQTJFO3N0b3Atb3BhY2l0eTowLjQiIC8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2dyYWQpIiAvPjwvc3ZnPg=="
                />
              </div>
            ) : isFictionalUser && (profile as FictionalUser).profile_pictures.length > 0 ? (
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-gray-700/50 shadow-lg">
                <Image
                  src={(profile as FictionalUser).profile_pictures[0]}
                  alt={profile.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMkQxQjRFO3N0b3Atb3BhY2l0eTowLjgiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMkQxQjRFO3N0b3Atb3BhY2l0eTowLjQiIC8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2dyYWQpIiAvPjwvc3ZnPg=="
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border-2 border-gray-700/50 flex items-center justify-center text-2xl font-bold text-gray-400">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Compact Info Grid */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-gray-400 mb-0.5">Name</div>
                <div className="text-gray-50 font-medium truncate">{profile.name}</div>
              </div>
              <div>
                <div className="text-gray-400 mb-0.5">Age</div>
                <div className="text-gray-50 font-medium">{profile.age}</div>
              </div>
              <div>
                <div className="text-gray-400 mb-0.5">Gender</div>
                <div className="text-gray-50 font-medium capitalize">{profile.gender}</div>
              </div>
              <div>
                <div className="text-gray-400 mb-0.5">Location</div>
                <div className="text-gray-50 font-medium truncate">{profile.location}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Compact Info */}
        {isRealUser && (
          <div className="grid grid-cols-2 gap-2 text-xs bg-[#1A1A2E]/20 rounded-lg p-2 border border-gray-700/20">
            <div>
              <div className="text-gray-400 mb-0.5">Display Name</div>
              <div className="text-gray-200 truncate">{(profile as RealUser).display_name}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-0.5">Looking For</div>
              <div className="text-gray-200 capitalize">{(profile as RealUser).looking_for}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-0.5">Credits</div>
              <div className="text-gray-200">{(profile as RealUser).credits}</div>
            </div>
            <div className="col-span-2">
              <div className="text-gray-400 mb-0.5">Email</div>
              <div className="text-gray-200 text-xs break-all">{(profile as RealUser).email}</div>
            </div>
          </div>
        )}

        {/* Bio for Fictional Users */}
        {isFictionalUser && (profile as FictionalUser).bio && (
          <div className="bg-[#1A1A2E]/20 rounded-lg p-2 border border-gray-700/20">
            <div className="text-xs text-gray-400 mb-1">Bio</div>
            <p className="text-xs text-gray-200 leading-relaxed line-clamp-3">
              {(profile as FictionalUser).bio}
            </p>
          </div>
        )}

        {/* Additional Profile Pictures for Fictional Users - Compact */}
        {isFictionalUser && (profile as FictionalUser).profile_pictures.length > 1 && (
          <div className="flex gap-1 overflow-x-auto pb-1">
            {(profile as FictionalUser).profile_pictures.slice(1, 5).map((pic, index) => (
              <div key={index} className="relative w-12 h-12 rounded overflow-hidden border border-gray-700/50 flex-shrink-0">
                <Image
                  src={pic}
                  alt={`${profile.name} - ${index + 2}`}
                  fill
                  className="object-cover"
                  sizes="48px"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMkQxQjRFO3N0b3Atb3BhY2l0eTowLjgiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMkQxQjRFO3N0b3Atb3BhY2l0eTowLjQiIC8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJ1cmwoI2dyYWQpIiAvPjwvc3ZnPg=="
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes Section - Takes remaining space */}
      <div className="flex-1 flex flex-col min-h-0 border-t border-gray-700/50 pt-4">
        {/* Notes Header */}
        <div className="flex-shrink-0 flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-gray-300">
            Operator Notes
          </label>
          <span className="text-xs text-gray-500">Newest first</span>
        </div>

        {/* Existing Notes Display - Read-only, scrollable */}
        <div className="flex-1 min-h-0 mb-3">
          {existingNotes ? (
            <div className="h-full overflow-y-auto px-4 py-3 bg-[#1A1A2E]/30 border border-gray-700/30 rounded-lg">
              <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                {existingNotes}
              </pre>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center px-4 py-3 bg-[#1A1A2E]/30 border border-gray-700/30 rounded-lg">
              <p className="text-sm text-gray-500 text-center">No notes yet. Add your first note below.</p>
            </div>
          )}
        </div>

        {/* Add New Note Section */}
        <div className="flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-400">
              Add New Note
            </label>
            {newNote.trim() && (
              <span className="text-xs text-yellow-400">Ready to save</span>
            )}
          </div>
          <div className="flex gap-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSaveNewNote()
                }
              }}
              placeholder="Type your note here... (Cmd/Ctrl + Enter to save)"
              className="flex-1 min-h-[80px] px-4 py-3 bg-[#1A1A2E]/50 border border-gray-700/50 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 resize-none transition-all"
              disabled={isSaving}
            />
            <GlassButton
              onClick={handleSaveNewNote}
              disabled={!newNote.trim() || isSaving}
              className="flex items-center justify-center gap-2 px-4 py-3 h-auto self-end"
            >
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span className="hidden sm:inline">Add</span>
                </>
              )}
            </GlassButton>
          </div>
          <p className="text-xs text-gray-500">New notes will be added at the top with timestamp</p>
        </div>
      </div>
    </div>
  )
}

interface InfoBadgeProps {
  label: string
  value: string
}

const InfoBadge: FC<InfoBadgeProps> = ({ label, value }) => {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-sm font-medium text-gray-50">{value}</div>
    </div>
  )
}
