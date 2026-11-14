import { supabase } from './supabase'

const base = () => window.location.origin

// Anonymous sessions are upgraded, never replaced: updateUser / linkIdentity
// keep the same user id, which is what preserves pre-signup votes.
export async function emailUpgradeOrSignIn(email: string) {
  const { data } = await supabase.auth.getSession()
  const anonymous = data.session?.user.is_anonymous === true
  if (anonymous) {
    return supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${base()}/feed` },
    )
  }
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${base()}/feed` },
  })
}

export async function googleUpgradeOrSignIn() {
  const { data } = await supabase.auth.getSession()
  const anonymous = data.session?.user.is_anonymous === true
  const options = { redirectTo: `${base()}/feed` }
  if (anonymous) return supabase.auth.linkIdentity({ provider: 'google', options })
  return supabase.auth.signInWithOAuth({ provider: 'google', options })
}

export async function startAnonymous() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return
  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw error
}