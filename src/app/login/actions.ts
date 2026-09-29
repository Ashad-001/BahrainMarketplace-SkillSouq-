'use server'

import { createClient } from '@supabase/supabase-js'

/**
 * SKILL SOUQ - Server-Side Auth Actions
 * These run on the server (Node.js), bypassing browser-level ad-blockers and firewalls.
 */

// We initialize a one-off client for the server action
// using the keys we've verified from your screenshot.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function login(formData: any) {
  const email = formData.email as string
  const password = formData.password as string

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password: password.trim(),
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, user: data.user }
}

export async function signup(formData: any, origin: string) {
  const email = formData.email as string
  const password = formData.password as string

  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password: password.trim(),
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, user: data.user }
}