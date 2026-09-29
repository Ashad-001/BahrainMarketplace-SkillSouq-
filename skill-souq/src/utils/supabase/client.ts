import { createBrowserClient } from '@supabase/ssr'

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return supabaseInstance
}