import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { useProfile } from '../hooks/useProfile'
import { useSession } from '../hooks/useSession'
import { deleteSplit, fetchChoiceCount, fetchMySplits, type MySplit } from '../lib/api'

const UNLOCK_AT = 20

export function Profile() {
  const session = useSession()
  const { profile } = useProfile(session?.user.id)
  const navigate = useNavigate()

  const [splits, setSplits] = useState<MySplit[] | null>(null)
  const [choiceCount, setChoiceCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [list, count] = await Promise.all([fetchMySplits(), fetchChoiceCount()])
      setSplits(list)
      setChoiceCount(count)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your profile')
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function remove(id: string) {
    setBusyId(id)
    try {
      await deleteSplit(id)
      setSplits((s) => (s ? s.filter((x) => x.id !== id) : s))
      setConfirmId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete')
    } finally {
      setBusyId(null)
    }
  }

  if (!session) return null

  const done = choiceCount ?? 0
  const unlocked = done >= UNLOCK_AT
  const progress = Math.min(done, UNLOCK_AT)

  return (
    <main className="stack">
      <header className="topbar">
        <h1 className="brand">{profile?.display_name ?? profile?.handle ?? 'You'}</h1>
        {profile?.is_private && <span className="pill">Private</span>}
      </header>

      <section className="panel">
        <h2>Alignment</h2>
        {unlocked ? (
          <p className="hint">Unlocked. Scores land in Wave 1.5.</p>
        ) : (
          <>
            <p className="hint">Unlocks after {UNLOCK_AT} choices. You're on {progress}.</p>
            <div className="progress">
              <div className="progress-fill" style={{ width: `${(progress / UNLOCK_AT) * 100}%` }} />
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <h2>Your Splits</h2>
        {splits === null && !error && <p className="hint">Loading…</p>}
        {splits && splits.length === 0 && (
          <>
            <p className="hint">You haven't published a Split yet.</p>
            <button className="secondary" onClick={() => navigate('/create')}>Write one</button>
          </>
        )}
        {splits && splits.length > 0 && (
          <ul className="split-list">
            {splits.map((s) => (
              <li key={s.id} className="split-row">
                <div className="split-text">
                  <p className="prompt small">{s.title}</p>
                  <p className="hint">{s.vote_count} votes · {s.tag_slug} · {s.status}</p>
                </div>
                {confirmId === s.id ? (
                  <div className="split-actions">
                    <button className="danger" disabled={busyId === s.id} onClick={() => remove(s.id)}>
                      {busyId === s.id ? 'Deleting…' : 'Delete'}
                    </button>
                    <button className="ghost" disabled={busyId === s.id} onClick={() => setConfirmId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button className="ghost" onClick={() => setConfirmId(s.id)} aria-label="Options">…</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="error">{error}</p>}
      <BottomNav />
    </main>
  )
}