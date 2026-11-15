import { useEffect, useState } from 'react'
import { fetchProfile } from '../lib/api'
import type { Profile } from '../lib/types'

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetchProfile(userId)
      .then((p) => !cancelled && setProfile(p))
      .catch(() => !cancelled && setProfile(null))
    return () => { cancelled = true }
  }, [userId, reloadKey])

  return { profile, reload: () => setReloadKey((k) => k + 1) }
}