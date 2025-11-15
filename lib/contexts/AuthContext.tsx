'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type UserRole = 'real_user' | 'operator' | 'admin' | null

interface SignUpData {
  name: string
  displayName: string
  location: string
  latitude: number | null
  longitude: number | null
  gender: 'male' | 'female'
  lookingFor: 'male' | 'female'
  age: number
  password: string
}

interface AuthContextType {
  user: User | null
  role: UserRole
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (data: SignUpData) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          await detectUserRole(session.user.id)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await detectUserRole(session.user.id)
        } else {
          setUser(null)
          setRole(null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const detectUserRole = async (userId: string): Promise<void> => {
    try {
      // Check if user is an admin
      const { data: adminData } = await supabase
        .from('admins')
        .select('id')
        .eq('id', userId)
        .single()

      if (adminData) {
        setRole('admin')
        return
      }

      // Check if user is an operator
      const { data: operatorData } = await supabase
        .from('operators')
        .select('id, is_active')
        .eq('id', userId)
        .single()

      if (operatorData) {
        // Only set role if account is active
        if (operatorData.is_active) {
          setRole('operator')
        } else {
          setRole(null)
        }
        return
      }

      // Check if user is a real user
      const { data: realUserData } = await supabase
        .from('real_users')
        .select('id, is_active')
        .eq('id', userId)
        .single()

      if (realUserData) {
        // Only set role if account is active
        if (realUserData.is_active) {
          setRole('real_user')
        } else {
          setRole(null)
        }
        return
      }

      // No role found
      setRole(null)
    } catch (error) {
      console.error('Error detecting user role:', error)
      setRole(null)
    }
  }

  const signIn = async (email: string, password: string): Promise<void> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }

    if (data.user) {
      // Check if the account is active before allowing login
      const userId = data.user.id
      
      // Check operator status
      const { data: operatorData } = await supabase
        .from('operators')
        .select('is_active')
        .eq('id', userId)
        .maybeSingle()
      
      if (operatorData && !operatorData.is_active) {
        // Sign out the user immediately
        await supabase.auth.signOut()
        throw new Error('Your account has been deactivated. Please contact an administrator.')
      }
      
      // Check real user status
      const { data: realUserData } = await supabase
        .from('real_users')
        .select('is_active')
        .eq('id', userId)
        .maybeSingle()
      
      if (realUserData && !realUserData.is_active) {
        // Sign out the user immediately
        await supabase.auth.signOut()
        throw new Error('Your account has been suspended. Please contact support.')
      }
      
      setUser(data.user)
      await detectUserRole(data.user.id)
    }
  }

  const signUp = async (data: SignUpData): Promise<void> => {
    // Generate email in name@fantooo.com format
    const email = `${data.name}@fantooo.com`

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: data.password,
    })

    if (authError) {
      throw authError
    }

    if (!authData.user) {
      throw new Error('Failed to create user')
    }

    // Create real_users record
    const { error: profileError } = await supabase
      .from('real_users')
      .insert({
        id: authData.user.id,
        name: data.name,
        display_name: data.displayName,
        email,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        gender: data.gender,
        looking_for: data.lookingFor,
        age: data.age,
      })

    if (profileError) {
      // If profile creation fails, delete the auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    setUser(authData.user)
    setRole('real_user')
  }

  const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw error
    }

    setUser(null)
    setRole(null)
    router.push('/')
  }

  const value: AuthContextType = {
    user,
    role,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}
