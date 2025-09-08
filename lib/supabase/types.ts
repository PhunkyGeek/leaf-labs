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
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          updated_at?: string
        }
      }
      scans: {
        Row: {
          id: string
          user_id: string
          image_url: string
          created_at: string
          model_version: string
          confidence: number
          status: 'processing' | 'completed' | 'failed'
        }
        Insert: {
          id?: string
          user_id: string
          image_url: string
          created_at?: string
          model_version: string
          confidence: number
          status?: 'processing' | 'completed' | 'failed'
        }
        Update: {
          id?: string
          user_id?: string
          image_url?: string
          model_version?: string
          confidence?: number
          status?: 'processing' | 'completed' | 'failed'
        }
      }
      scan_results: {
        Row: {
          id: string
          scan_id: string
          disease_id: string | null
          stage: number | null
          parts: Json
          explanation: string
          advice: string
          postcare: string
          created_at: string
        }
        Insert: {
          id?: string
          scan_id: string
          disease_id?: string | null
          stage?: number | null
          parts: Json
          explanation: string
          advice: string
          postcare: string
          created_at?: string
        }
        Update: {
          id?: string
          scan_id?: string
          disease_id?: string | null
          stage?: number | null
          parts?: Json
          explanation?: string
          advice?: string
          postcare?: string
        }
      }
      diseases: {
        Row: {
          id: string
          name: string
          type: 'fungal' | 'bacterial' | 'viral'
          short_desc: string
          long_desc: string
          thumbnail_url: string
          tips: Json
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'fungal' | 'bacterial' | 'viral'
          short_desc: string
          long_desc: string
          thumbnail_url: string
          tips: Json
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'fungal' | 'bacterial' | 'viral'
          short_desc?: string
          long_desc?: string
          thumbnail_url?: string
          tips?: Json
        }
      }
      meta: {
        Row: {
          id: string
          last_synced_at: string
          created_at: string
        }
        Insert: {
          id?: string
          last_synced_at: string
          created_at?: string
        }
        Update: {
          id?: string
          last_synced_at?: string
        }
      }
    }
  }
}