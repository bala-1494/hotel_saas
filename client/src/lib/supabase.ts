import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase env check:', {
  url: supabaseUrl ? 'provided' : 'missing',
  key: supabaseAnonKey ? 'provided' : 'missing',
  urlType: typeof supabaseUrl,
  keyType: typeof supabaseAnonKey,
  actualUrl: supabaseUrl,
  urlLength: supabaseUrl?.length
})

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'undefined' || supabaseAnonKey === 'undefined') {
  console.error('Supabase configuration error:', {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? '[REDACTED]' : 'missing'
  })
  throw new Error('Missing or invalid Supabase environment variables. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

// Validate URL format
if (!supabaseUrl.startsWith('https://') && !supabaseUrl.startsWith('http://')) {
  console.error('Invalid Supabase URL format:', supabaseUrl)
  throw new Error('Supabase URL must start with https:// or http://. Current value: ' + supabaseUrl)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)