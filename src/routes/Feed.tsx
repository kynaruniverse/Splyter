// src/routes/Feed.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '../components/Card'
import { RevealPanel } from '../components/RevealPanel'
import { ReportSheet } from '../components/ReportSheet'
import { TapButtons } from '../components/TapButtons'
import { useSwipe } from '../hooks/useSwipe'
import { castVote, fetchFeed, fetchResults, recordSkip } from '../lib/api'
import type { Results, Side, Split } from '../lib/types'
import { useSwipeStore } from '../store/swipe'

type Reveal = Results & { choice: Side; pending: boolean }

export function Feed() {
  const [queue, setQueue] = useState<Split[]>([])
  const [index, setIndex] = useState(0)
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reporting, setReporting] = useState(false)
  const visibleAt = useRef(0)

  const current = queue[index]

  useEffect(() => {
    fetchFeed()
      .then((rows) => setQueue(rows))
      .catch((e) => setError(e instanceof Error ? e.message : 'Feed failed to load'))
  }, [])

  useEffect(() => {
    visibleAt.current = performance.now()
  }, [current?.id])

  const next = useCallback(() => {
    setReveal(null)
    useSwipeStore.getState().reset()
    setIndex((n) => n + 1)
  }, [])

  const onChoice = useCallback(
    async (side: Side) => {
      if (!current) return
      // Optimistic reveal from the counts we already hold — no invented numbers.
      setReveal({
        a: current.counts_a + (side === 'a' ? 1 : 0),
        b: current.counts_b + (side === 'b' ? 1 : 0),
        choice: side,
        pending: true,
      })

      try {
        await castVote(current.id, side)
      } catch {
        setError('Vote not saved — check your connection')
      }

      try {
        const fresh = await fetchResults(current.id)
        setReveal((r) => (r ? { ...fresh, choice: r.choice, pending: false } : r))
        useSwipeStore.getState().reveal()
      } catch {
        setReveal((r) => (r ? { ...r, pending: false } : r))
      }
    },
    [current],
  )

  const onSkip = useCallback(() => {
    if (!current) return
    // "First second" is measured from when the card became visible.
    const elapsed = performance.now() - visibleAt.current
    next()
    recordSkip(current.id, elapsed).catch(() => {})
  }, [current, next])

  const onBack = useCallback(() => {
    useSwipeStore.getState().reset()
    setReveal(null)
    setIndex((n) => Math.max(0, n - 1))
  }, [])

  const { cardRef, bind } = useSwipe({ onChoice, onSkip, onBack })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (reveal) {
        if (e.key === 'Enter' || e.key === 'ArrowUp') next()
        return
      }
      if (e.key === 'ArrowLeft') onChoice('a')
      if (e.key === 'ArrowRight') onChoice('b')
      if (e.key === 'ArrowUp') onSkip()
      if (e.key === 'ArrowDown') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reveal, next, onChoice, onSkip, onBack])

  if (error) return <p className="error">{error}</p>
  if (!current) return <p className="hint">That's everything for now.</p>

  return (
    <main className="stack">
      <header className="topbar">
        <span className="brand">Splyter</span>
        <button className="ghost" onClick={() => setReporting(true)}>
          Report
        </button>
      </header>

      <div className="card-area">
        <Card key={current.id} split={current} cardRef={cardRef} bind={bind} />
        {reveal && (
          <RevealPanel
            choice={reveal.choice}
            results={{ a: reveal.a, b: reveal.b }}
            pending={reveal.pending}
            onNext={next}
          />
        )}
      </div>

      <TapButtons onChoice={onChoice} onSkip={onSkip} disabled={Boolean(reveal)} />
      {reporting && <ReportSheet postId={current.id} onClose={() => setReporting(false)} />}
    </main>
  )
}