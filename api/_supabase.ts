// api/_supabase.ts
import { createClient } from '@supabase/supabase-js'

// Server-side only. Uses the service role key, which must never be
// referenced by a VITE_ variable or imported from src/.
export function adminSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { persistSession: false } })
}