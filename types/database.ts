export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      real_users: {
        Row: {
          id: string
          name: string
          display_name: string
          email: string
          location: string
          latitude: number | null
          longitude: number | null
          gender: 'male' | 'female'
          looking_for: 'male' | 'female'
          age: number
          profile_picture: string | null
          credits: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          display_name: string
          email: string
          location: string
          latitude?: number | null
          longitude?: number | null
          gender: 'male' | 'female'
          looking_for: 'male' | 'female'
          age: number
          profile_picture?: string | null
          credits?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          email?: string
          location?: string
          latitude?: number | null
          longitude?: number | null
          gender?: 'male' | 'female'
          looking_for?: 'male' | 'female'
          age?: number
          profile_picture?: string | null
          credits?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      fictional_users: {
        Row: {
          id: string
          name: string
          age: number
          gender: 'male' | 'female'
          location: string
          bio: string | null
          profile_pictures: string[]
          is_active: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          age: number
          gender: 'male' | 'female'
          location: string
          bio?: string | null
          profile_pictures?: string[]
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          age?: number
          gender?: 'male' | 'female'
          location?: string
          bio?: string | null
          profile_pictures?: string[]
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
      }
      chats: {
        Row: {
          id: string
          real_user_id: string
          fictional_user_id: string
          real_profile_notes: string
          fictional_profile_notes: string
          message_count: number
          last_message_at: string
          assigned_operator_id: string | null
          assignment_time: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          real_user_id: string
          fictional_user_id: string
          real_profile_notes?: string
          fictional_profile_notes?: string
          message_count?: number
          last_message_at?: string
          assigned_operator_id?: string | null
          assignment_time?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          real_user_id?: string
          fictional_user_id?: string
          real_profile_notes?: string
          fictional_profile_notes?: string
          message_count?: number
          last_message_at?: string
          assigned_operator_id?: string | null
          assignment_time?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          sender_type: 'real' | 'fictional'
          content: string
          handled_by_operator_id: string | null
          is_free_message: boolean
          created_at: string
          delivered_at: string | null
          read_at: string | null
        }
        Insert: {
          id?: string
          chat_id: string
          sender_type: 'real' | 'fictional'
          content: string
          handled_by_operator_id?: string | null
          is_free_message?: boolean
          created_at?: string
          delivered_at?: string | null
          read_at?: string | null
        }
        Update: {
          id?: string
          chat_id?: string
          sender_type?: 'real' | 'fictional'
          content?: string
          handled_by_operator_id?: string | null
          is_free_message?: boolean
          created_at?: string
          delivered_at?: string | null
          read_at?: string | null
        }
      }
      operators: {
        Row: {
          id: string
          name: string
          email: string
          is_active: boolean
          is_available: boolean
          last_activity: string
          total_messages: number
          created_at: string
          created_by: string | null
        }
        Insert: {
          id: string
          name: string
          email: string
          is_active?: boolean
          is_available?: boolean
          last_activity?: string
          total_messages?: number
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          is_active?: boolean
          is_available?: boolean
          last_activity?: string
          total_messages?: number
          created_at?: string
          created_by?: string | null
        }
      }
      admins: {
        Row: {
          id: string
          name: string
          email: string
          is_super_admin: boolean
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          is_super_admin?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          is_super_admin?: boolean
          created_at?: string
        }
      }
      favorites: {
        Row: {
          id: string
          real_user_id: string
          fictional_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          real_user_id: string
          fictional_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          real_user_id?: string
          fictional_user_id?: string
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          real_user_id: string
          amount: number
          credits_purchased: number
          paystack_reference: string
          status: 'pending' | 'success' | 'failed'
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          real_user_id: string
          amount: number
          credits_purchased: number
          paystack_reference: string
          status?: 'pending' | 'success' | 'failed'
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          real_user_id?: string
          amount?: number
          credits_purchased?: number
          paystack_reference?: string
          status?: 'pending' | 'success' | 'failed'
          created_at?: string
          completed_at?: string | null
        }
      }
      operator_stats: {
        Row: {
          id: string
          operator_id: string
          date: string
          messages_sent: number
          chats_handled: number
          created_at: string
        }
        Insert: {
          id?: string
          operator_id: string
          date: string
          messages_sent?: number
          chats_handled?: number
          created_at?: string
        }
        Update: {
          id?: string
          operator_id?: string
          date?: string
          messages_sent?: number
          chats_handled?: number
          created_at?: string
        }
      }
      operator_activity: {
        Row: {
          id: string
          chat_id: string
          operator_id: string
          last_activity: string
          updated_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          operator_id: string
          last_activity?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          operator_id?: string
          last_activity?: string
          updated_at?: string
        }
      }
      chat_assignments: {
        Row: {
          id: string
          chat_id: string
          operator_id: string
          assigned_at: string
          released_at: string | null
          release_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          operator_id: string
          assigned_at?: string
          released_at?: string | null
          release_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          operator_id?: string
          assigned_at?: string
          released_at?: string | null
          release_reason?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_chat_to_operator: {
        Args: {
          p_operator_id: string
        }
        Returns: string | null
      }
      release_and_reassign_chat: {
        Args: {
          p_chat_id: string
          p_reason: string
        }
        Returns: void
      }
      get_available_fictional_profiles: {
        Args: {
          p_gender: 'male' | 'female'
        }
        Returns: Database['public']['Tables']['fictional_users']['Row'][]
      }
      update_operator_stats: {
        Args: {
          p_operator_id: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
