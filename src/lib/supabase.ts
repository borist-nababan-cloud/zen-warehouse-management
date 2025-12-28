/**
 * Supabase Client Configuration
 *
 * Using the main domain (bensupabase.nababancloud.com) which has proper SSL
 * configured by Coolify, instead of the Kong subdomain.
 */

import { createClient } from '@supabase/supabase-js'

// Supabase URL and anon key from environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

/**
 * Supabase client instance
 * Use this for all database operations
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Store auth session in localStorage (default for web)
    storage: window.localStorage,
    // Auto-refresh token
    autoRefreshToken: true,
    // Detect session in URL hash (for OAuth/magic link)
    detectSessionInUrl: true,
    // Persist session across page reloads
    persistSession: true,
  },
})

/**
 * Database type helper for TypeScript autocompletion
 * Usage: supabase.from('profiles').select('*')
 */
export type Database = {
  public: {
    Tables: {
      locations: {
        Row: import('../types/database').Location
        Insert: Omit<import('../types/database').Location, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<import('../types/database').Location>
      }
      profiles: {
        Row: import('../types/database').Profile
        Insert: Omit<import('../types/database').Profile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<import('../types/database').Profile>
      }
    }
  }
}
