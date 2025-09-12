import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Log environment variables for debugging (remove in production)
console.log('Supabase env check:', {
  url: supabaseUrl ? 'provided' : 'missing',
  key: supabaseAnonKey ? 'provided' : 'missing',
  urlType: typeof supabaseUrl,
  keyType: typeof supabaseAnonKey,
  actualUrl: supabaseUrl,
  urlLength: supabaseUrl?.length
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.')
}

// Validate URL format before creating client
if (!supabaseUrl.startsWith('https://') && !supabaseUrl.startsWith('http://')) {
  console.error('Invalid Supabase URL format:', supabaseUrl);
  throw new Error(`Supabase URL must start with https:// or http://. Current value: ${supabaseUrl}`);
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)