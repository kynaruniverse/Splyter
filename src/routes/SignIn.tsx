import { useState } from 'react'
import { emailUpgradeOrSignIn, googleUpgradeOrSignIn } from '../lib/auth'

export function SignIn() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<{ error: { message: string } | null }>) {
    setBusy(true)
    setError(null)
    try {
      const { error } = await fn()
      if (error) throw new Error(error.message)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await run(async () => {
      const res = await emailUpgradeOrSignIn(email)
      if (!res.error) setStatus('Check your email for the link.')
      return res
    })
  }

  return (
    <div className="gate">
      <h1>Sign in</h1>
      <p className="hint">Keep your votes. Sign in and we'll walk you through setup.</p>
      <button className="primary" disabled={busy} onClick={() => run(googleUpgradeOrSignIn)}>
        Continue with Google
      </button>
      <form onSubmit={submit}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <button className="secondary" disabled={busy}>Email me a link</button>
      </form>
      {status && <p className="hint">{status}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  )
}