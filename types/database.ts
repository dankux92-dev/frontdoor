export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'agent' | 'buyer' | 'renter'
          email: string
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          role: 'agent' | 'buyer' | 'renter'
          email: string
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'agent' | 'buyer' | 'renter'
          email?: string
          full_name?: string | null
          created_at?: string
        }
        Relationships: never[]
      }
      buyer_preferences: {
        Row: {
          id: string
          target_area: string | null
          budget_range: string | null
          move_timeframe: '0-3' | '3-6' | '6+' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          target_area?: string | null
          budget_range?: string | null
          move_timeframe?: '0-3' | '3-6' | '6+' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          target_area?: string | null
          budget_range?: string | null
          move_timeframe?: '0-3' | '3-6' | '6+' | null
          created_at?: string
          updated_at?: string
        }
        Relationships: never[]
      }
      agents: {
        Row: {
          id: string
          agency_name: string
          areas: string[]
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          agency_name: string
          areas?: string[]
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          agency_name?: string
          areas?: string[]
          is_active?: boolean
          created_at?: string
        }
        Relationships: never[]
      }
      verifications: {
        Row: {
          id: string
          profile_id: string
          status: 'pending' | 'in_progress' | 'verified' | 'failed'
          id_check_result: string | null
          income_verified: boolean
          docs_url: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          status?: 'pending' | 'in_progress' | 'verified' | 'failed'
          id_check_result?: string | null
          income_verified?: boolean
          docs_url?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          status?: 'pending' | 'in_progress' | 'verified' | 'failed'
          id_check_result?: string | null
          income_verified?: boolean
          docs_url?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: never[]
      }
      intent_scores: {
        Row: {
          id: string
          profile_id: string
          score: number
          signals: Json
          computed_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          score?: number
          signals?: Json
          computed_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          score?: number
          signals?: Json
          computed_at?: string
        }
        Relationships: never[]
      }
      activity_log: {
        Row: {
          id: string
          profile_id: string
          date: string
          active: boolean
        }
        Insert: {
          id?: string
          profile_id: string
          date: string
          active?: boolean
        }
        Update: {
          id?: string
          profile_id?: string
          date?: string
          active?: boolean
        }
        Relationships: never[]
      }
      knocks: {
        Row: {
          id: string
          profile_id: string
          property_address: string
          property_postcode: string
          agent_id: string
          status: 'pending' | 'confirmed' | 'expired'
          knocked_at: string
          expires_at: string
          confirmed_at: string | null
          needs_review: boolean
        }
        Insert: {
          id?: string
          profile_id: string
          property_address: string
          property_postcode: string
          agent_id: string
          status?: 'pending' | 'confirmed' | 'expired'
          knocked_at?: string
          expires_at?: string
          confirmed_at?: string | null
          needs_review?: boolean
        }
        Update: {
          id?: string
          profile_id?: string
          property_address?: string
          property_postcode?: string
          agent_id?: string
          status?: 'pending' | 'confirmed' | 'expired'
          knocked_at?: string
          expires_at?: string
          confirmed_at?: string | null
          needs_review?: boolean
        }
        Relationships: never[]
      }
      notifications: {
        Row: {
          id: string
          profile_id: string
          type: string
          knock_id: string | null
          message: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          type: string
          knock_id?: string | null
          message: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          type?: string
          knock_id?: string | null
          message?: string
          read?: boolean
          created_at?: string
        }
        Relationships: never[]
      }
      viewings: {
        Row: {
          id: string
          knock_id: string
          outcome: 'booked' | 'attended' | 'no_action'
          outcome_at: string
        }
        Insert: {
          id?: string
          knock_id: string
          outcome: 'booked' | 'attended' | 'no_action'
          outcome_at?: string
        }
        Update: {
          id?: string
          knock_id?: string
          outcome?: 'booked' | 'attended' | 'no_action'
          outcome_at?: string
        }
        Relationships: never[]
      }
      leads: {
        Row: {
          id: string
          profile_id: string
          agent_id: string
          unlocked_at: string
          price_range: string | null
          move_date: string | null
          postcode_area: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          agent_id: string
          unlocked_at?: string
          price_range?: string | null
          move_date?: string | null
          postcode_area?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          agent_id?: string
          unlocked_at?: string
          price_range?: string | null
          move_date?: string | null
          postcode_area?: string | null
        }
        Relationships: never[]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
  }
}
