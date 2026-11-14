import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { emailUpgradeOrSignIn, googleUpgradeOrSignIn } from '../lib/auth'
import { redeemInvite } from '../lib/api'

export function SignIn() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
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

  async function claim() {
    await run(async () => {
      await redeemInvite(code)
      navigate('/feed')
      return { error: null }
    })
  }

  return (
    <div className="gate">
      <h1>Keep your votes</h1>
      <p className="hint">Sign in and the choices you already made stay on this account.</p>

      <button className="primary" disabled={busy} onClick={() => run(googleUpgradeOrSignIn)}>
        Continue with Google
      </button>

      <form onSubmit={submit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <button className="secondary" disabled={busy}>
          Email me a link
        </button>
      </form>

      {status && <p className="hint">{status}</p>}

      <hr />
      <label>
        Invite code
        <input value={code} onChange={(e) => setCode(e.target.value)} />
      </label>
      <button className="secondary" disabled={busy || !code} onClick={claim}>
        Use code
      </button>

      {error && <p className="error">{error}</p>}
    </div>
  )
}