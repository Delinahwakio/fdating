'use client'

import { FC, useState } from 'react'
import Image from 'next/image'
import { RealUser, FictionalUser } from '@/types/database'
import { GlassButton } from '@/components/shared/GlassButton'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

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
  notes,
  chatId,
  notesField
}) => {
  const [editedNotes, setEditedNotes] = useState(notes)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const supabase = createClient()

  const isRealUser = 'credits' in profile
  const isFictionalUser = 'bio' in profile

  const handleNotesChange = (value: string) => {
    setEditedNotes(value)
    setHasChanges(value !== notes)
  }

  const handleSaveNotes = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('chats')
        .update({ [notesField]: editedNotes })
        .eq('id', chatId)

      if (error) throw error

      toast.success('Notes saved successfully')
      setHasChanges(false)
    } catch (err) {
      console.error('Error saving notes:', err)
      toast.error('Failed to save notes')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <h2 className="text-xl font-bold text-gray-50 border-b border-gray-700 pb-3">
        {title}
      </h2>

      {/* Profile Picture */}
      {isRealUser && profile.profile_picture && (
        <div className="flex justify-center">
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-gray-700">
            <Image
              src={profile.profile_picture}
              alt={profile.name}
              fill
              className="object-cover"
            />
          </div>
        </div>
      )}

      {isFictionalUser && (profile as FictionalUser).profile_pictures.length > 0 && (
        <div className="space-y-3">
          {(profile as FictionalUser).profile_pictures.map((pic, index) => (
            <div key={index} className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-700">
              <Image
                src={pic}
                alt={`${profile.name} - ${index + 1}`}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Profile Information */}
      <div className="space-y-3">
        <ProfileField label="Name" value={profile.name} />
        <ProfileField label="Age" value={profile.age.toString()} />
        <ProfileField label="Gender" value={profile.gender} />
        <ProfileField label="Location" value={profile.location} />

        {isRealUser && (
          <>
            <ProfileField label="Display Name" value={(profile as RealUser).display_name} />
            <ProfileField label="Email" value={(profile as RealUser).email} />
            <ProfileField label="Looking For" value={(profile as RealUser).looking_for} />
            <ProfileField label="Credits" value={(profile as RealUser).credits.toString()} />
          </>
        )}

        {isFictionalUser && (profile as FictionalUser).bio && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-400">Bio</label>
            <p className="text-gray-200 text-sm leading-relaxed bg-[#1A1A2E]/50 p-3 rounded-lg border border-gray-700">
              {(profile as FictionalUser).bio}
            </p>
          </div>
        )}
      </div>

      {/* Notes Section */}
      <div className="space-y-3 pt-4 border-t border-gray-700">
        <label className="text-sm font-medium text-gray-400">
          Notes (Private - Only visible to operators)
        </label>
        <textarea
          value={editedNotes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Add notes about this profile..."
          className="w-full h-32 px-4 py-3 bg-[#1A1A2E]/50 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 resize-none"
        />
        {hasChanges && (
          <GlassButton
            onClick={handleSaveNotes}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? 'Saving...' : 'Save Notes'}
          </GlassButton>
        )}
      </div>
    </div>
  )
}

interface ProfileFieldProps {
  label: string
  value: string
}

const ProfileField: FC<ProfileFieldProps> = ({ label, value }) => {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-400">{label}</label>
      <p className="text-gray-200 bg-[#1A1A2E]/50 px-3 py-2 rounded-lg border border-gray-700">
        {value}
      </p>
    </div>
  )
}
