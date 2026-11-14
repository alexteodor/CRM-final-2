import { createClient } from '@supabase/supabase-js'
const env = import.meta.env
const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
export const hasSupabase = Boolean(url && key)
export const missingEnv = [!url && 'VITE_SUPABASE_URL', !key && 'VITE_SUPABASE_ANON_KEY'].filter(Boolean)
export const supabase = hasSupabase ? createClient(url, key) : null
