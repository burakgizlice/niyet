// Block 16: the single Supabase client instance used app-wide.
//
// Every module that talks to Supabase imports { supabase } from here — the
// client is instantiated exactly once. The anon key is safe to ship in the
// browser bundle; Row Level Security enforces per-user isolation server-side.
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
