import { useEffect, useState } from 'react'
import { completeProfile, isAnonymous, isMember, redeemInvite } from '../lib/api'

type Props = {
  userId: string
  children: React.ReactNode
}

const DEFAULT_COLOR = '#4f8cff'

// A member is non-anonymous, has redeemed an invite, and has a handle.
export function RequireProfile({ userId, children }: Props) {
  const [state, setState] = useState<'loading' | 'anonymous' | 'setup' | 'member' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setState('loading')
    try {
      if (await isAnonymous()) return setState('anonymous')
      if (await isMember()) return setState('member')
      setState('setup')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your account')
      setState('error')
    }
  }

  useEffect(() => { refresh() }, [userId])

  if (state === 'loading') return <p className="hint">Loading…</p>
  if (state === 'error') return <p className="error">{error}</p>

  if (state === 'anonymous') {
    return (
      <div className="gate">
        <h1>Sign in to continue</h1>
        <p className="hint">Your choices are saved. Sign in fully to join the feed.</p>
        <button className="primary" onClick={() => { window.location.href = '/signin' }}>
          Sign in
        </button>
      </div>
    )
  }

  if (state === 'setup') return <SetupForm onDone={refresh} />

  return <>{children}</>
}

function SetupForm({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('')
  const [handle, setHandle] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatarColor, setAvatarColor] = useState(DEFAULT_COLOR)
  const [birthDate, setBirthDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOk = /^[a-z0-9_]{3,20}$/.test(handle)
  const ageOk = (() => {
    if (!birthDate) return false
    const d = new Date(birthDate)
    if (isNaN(d.getTime())) return false
    const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000))
    return age >= 13
  })()
  const canSubmit = code.trim().length > 0 && handleOk && ageOk && !busy

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      await redeemInvite(code.trim())
      await completeProfile({ handle, displayName, avatarColor, birthDate })
      onDone()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not finish setup'
      setError(msg.replace(/^\w+:\s*/, ''))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="gate" onSubmit={submit}>
      <h1>Set up your account</h1>
      <p className="hint">Splyter is invite-only during the test.</p>

      <label>
        Invite code
        <input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
      </label>

      <label>
        Handle
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value.toLowerCase())}
          placeholder="lowercase, 3-20 chars"
          autoComplete="off"
        />
        {handle && !handleOk && <span className="hint">3-20 chars: a-z, 0-9, _</span>}
      </label>

      <label>
        Display name (optional)
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} />
      </label>

      <label>
        Avatar colour
        <input type="color" value={avatarColor} onChange={(e) => setAvatarColor(e.target.value)} />
      </label>

      <label>
        Date of birth
        <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
      </label>
      <p className="hint">13+. Under-18 accounts stay private.</p>

      {error && <p className="error">{error}</p>}

      <button className="primary" disabled={!canSubmit}>
        {busy ? 'Setting up…' : 'Finish setup'}
      </button>
    </form>
  )
}