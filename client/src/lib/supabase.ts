import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if we're in testing mode (missing Supabase credentials)
export const isTestingMode = !supabaseUrl || !supabaseAnonKey

// Create supabase client only if credentials are available
export const supabase = isTestingMode 
  ? null 
  : createClient(supabaseUrl, supabaseAnonKey)