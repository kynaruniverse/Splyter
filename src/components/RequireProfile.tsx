import { useState } from 'react'
import { completeProfile } from '../lib/api'
import { useProfile } from '../hooks/useProfile'

// Age is collected once, after sign-up. Under-18s are locked private server-side.
export function RequireProfile({
  userId,
  children,
}: {
  userId: string
  children: React.ReactNode
}) {
  const { profile, reload } = useProfile(userId)
  const [ageBand, setAgeBand] = useState<'13-17' | '18+' | ''>('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (profile === undefined) return <p className="hint">Loading…</p>
  if (profile && profile.age_band) return <>{children}</>

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ageBand) return
    try {
      await completeProfile(name, ageBand)
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    }
  }

  return (
    <form className="gate" onSubmit={submit}>
      <h1>One last thing</h1>
      <label>
        Display name
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={24} />
      </label>
      <fieldset>
        <legend>Age</legend>
        <label>
          <input
            type="radio"
            name="age"
            checked={ageBand === '13-17'}
            onChange={() => setAgeBand('13-17')}
          />
          13–17
        </label>
        <label>
          <input
            type="radio"
            name="age"
            checked={ageBand === '18+'}
            onChange={() => setAgeBand('18+')}
          />
          18 or over
        </label>
      </fieldset>
      <p className="hint">Under-18 accounts are private by default and can't be changed later.</p>
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={!ageBand}>
        Continue
      </button>
    </form>
  )
}