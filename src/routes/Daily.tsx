// src/routes/Daily.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import { Card } from '../components/Card'
import { TapButtons } from '../components/TapButtons'
import { useSwipe } from '../hooks/useSwipe'
import { castVote, fetchDailyState } from '../lib/api'
import type { DailyState } from '../lib/daily'
import type { Side } from '../lib/types'
import { useSwipeStore } from '../store/swipe'

function useCountdown(iso: string | null) {
  const [left, setLeft] = useState<number>(0)
  useEffect(() => {
    if (!iso) return
    const target = new Date(iso).getTime()
    const tick = () => setLeft(Math.max(0, target - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [iso])
  const h = Math.floor(left / 3_600_000)
  const m = Math.floor((left % 3_600_000) / 60_000)
  const s = Math.floor((left % 60_000) / 1000)
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

export function Daily() {
  const [state, setState] = useState<DailyState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [justVoted, setJustVoted] = useState<Side | null>(null)
  const visibleAt = useRef(0)

  const load = useCallback(async () => {
    try {
      setState(await fetchDailyState())
      visibleAt.current = performance.now()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the Daily Split')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // On Daily, up is not a skip and down is not back: one card a day,
  // so the vertical axis has nothing to do. Swipe left/right still votes.
  const onChoice = useCallback(
    async (side: Side) => {
      if (!state?.today || state.voted) return
      setJustVoted(side) // optimistic
      try {
        await castVote(state.today.id, side)
        await load()
      } catch (e) {
        setJustVoted(null)
        setError(e instanceof Error ? e.message : 'Vote not saved')
      }
    },
    [state, load],
  )

  const { cardRef, bind } = useSwipe({
    onChoice,
    onSkip: () => {},
    onBack: () => {},
  })

  const countdown = useCountdown(state?.next_reveal_at ?? null)

  if (error) return <p className="error">{error}</p>
  if (!state) return <p className="hint">Loading…</p>

  const voted = state.voted ?? justVoted
  const shown = state.today

  return (
    <main className="stack">
      <header className="topbar">
        <span className="brand">Daily Split</span>
        <span className="hint">next in {countdown}</span>
      </header>

      {shown ? (
        <div className="card-area">
          <Card
            key={shown.id}
            split={shown}
            cardRef={cardRef}
            bind={voted ? {} : bind}
          />
          {voted && (
            <div className="reveal">
              <p className="reveal-label">
                You picked {voted.toUpperCase()}
              </p>
              <p className="hint">
                Counts reveal when the next Daily Split goes live. This one stays
                open until then.
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="hint">No Daily Split picked for today yet.</p>
      )}

      <TapButtons onChoice={onChoice} onSkip={() => {}} disabled={Boolean(voted)} />

      {state.yesterday && state.yesterday_results && (
        <section className="panel">
          <h2>Yesterday</h2>
          <p className="prompt small">{state.yesterday.prompt_a}</p>
          <span className="or">or</span>
          <p className="prompt small">{state.yesterday.prompt_b}</p>
          {(() => {
            const { a, b } = state.yesterday_results
            const total = a + b
            const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100))
            return (
              <>
                <div className="bar-row">
                  <div className="bar bar-a" style={{ width: `${pct(a)}%` }} />
                  <div className="bar bar-b" style={{ width: `${pct(b)}%` }} />
                </div>
                <p className="hint">
                  A {pct(a)}% · B {pct(b)}% · {total} votes
                </p>
                <img
                  className="result-card"
                  alt="Daily Split result"
                  src={`/api/result-card?day=${new Date(Date.now() - 86_400_000)
                    .toISOString()
                    .slice(0, 10)}`}
                />
              </>
            )
          })()}
        </section>
      )}

      <BottomNav />
    </main>
  )
}