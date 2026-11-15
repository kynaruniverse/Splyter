import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { startAnonymous } from '../lib/auth'

export function Welcome() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setBusy(true)
    setError(null)
    try {
      await startAnonymous()
      navigate('/onboarding')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gate">
      <h1>Splyter</h1>
      <p className="hint">Five cards. No account yet. See how it feels first.</p>
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={busy} onClick={start}>
        {busy ? 'Starting…' : 'Start'}
      </button>
    </div>
  )
}