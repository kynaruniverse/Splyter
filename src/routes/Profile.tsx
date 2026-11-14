// src/routes/Profile.tsx — replaces the stub
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { useProfile } from '../hooks/useProfile'
import { useSession } from '../hooks/useSession'
import { deleteSplit, fetchMyChoiceCount, fetchMySplits, type MySplit } from '../lib/api'

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
    if (!session?.user.id) return
    setError(null)
    try {
      const [list, count] = await Promise.all([
        fetchMySplits(),
        fetchMyChoiceCount(session.user.id),
      ])
      setSplits(list)
      setChoiceCount(count)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your profile')
    }
  }, [session?.user.id])

  useEffect(() => {
    load()
  }, [load])

  async function remove(id: string) {
    setBusyId(id)
    setError(null)
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
        <h1 className="brand">{profile?.display_name ?? 'You'}</h1>
        {profile?.is_private && <span className="pill">Private</span>}
      </header>

      <section className="panel">
        <h2>Alignment</h2>
        {unlocked ? (
          <p className="hint">
            Unlocked. Alignment scores and your Split history land in Wave 1.5.
          </p>
        ) : (
          <>
            <p className="hint">
              Unlocks after {UNLOCK_AT} choices. You're on {progress}.
            </p>
            <div className="progress">
              <div
                className="progress-fill"
                style={{ width: `${(progress / UNLOCK_AT) * 100}%` }}
              />
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
            <button className="secondary" onClick={() => navigate('/create')}>
              Write one
            </button>
          </>
        )}

        {splits && splits.length > 0 && (
          <ul className="split-list">
            {splits.map((s) => (
              <li key={s.id} className="split-row">
                <div className="split-text">
                  <p className="prompt small">{s.prompt_a}</p>
                  <span className="or">or</span>
                  <p className="prompt small">{s.prompt_b}</p>
                  <p className="hint">
                    A {s.counts_a} · B {s.counts_b}
                    {s.tags[0] ? ` · ${s.tags[0]}` : ''}
                  </p>
                </div>

                {confirmId === s.id ? (
                  <div className="split-actions">
                    <button
                      className="danger"
                      disabled={busyId === s.id}
                      onClick={() => remove(s.id)}
                    >
                      {busyId === s.id ? 'Deleting…' : 'Delete'}
                    </button>
                    <button
                      className="ghost"
                      disabled={busyId === s.id}
                      onClick={() => setConfirmId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="ghost"
                    aria-label="Options for this Split"
                    onClick={() => setConfirmId(s.id)}
                  >
                    …
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="hint">Published Splits can be deleted but not edited.</p>
      </section>

      {error && <p className="error">{error}</p>}

      <BottomNav />
    </main>
  )
}