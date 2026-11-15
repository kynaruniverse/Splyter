import { useCallback, useEffect, useRef, useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import { Card } from '../components/Card'
import { ReportSheet } from '../components/ReportSheet'
import { RevealPanel } from '../components/RevealPanel'
import { TapButtons } from '../components/TapButtons'
import { useSwipe } from '../hooks/useSwipe'
import { castChoice, fetchFeed, recordSkip, recordView } from '../lib/api'
import type { FeedSplit, Side, VoteResult } from '../lib/types'
import { useSwipeStore } from '../store/swipe'

export function Feed() {
  const [queue, setQueue] = useState<FeedSplit[]>([])
  const [index, setIndex] = useState(0)
  const [reveal, setReveal] = useState<VoteResult | null>(null)
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
    if (!current) return
    visibleAt.current = performance.now()
    recordView(current.post_id).catch(() => {})
  }, [current?.post_id])

  const next = useCallback(() => {
    setReveal(null)
    useSwipeStore.getState().reset()
    setIndex((n) => n + 1)
  }, [])

  const onChoice = useCallback(async (side: Side) => {
    if (!current || reveal) return
    try {
      const result = await castChoice(current.card_id, side)
      setReveal(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vote not saved')
    }
  }, [current, reveal])

  const onSkip = useCallback(() => {
    if (!current) return
    const early = performance.now() - visibleAt.current < 1000
    next()
    recordSkip(current.post_id, early).catch(() => {})
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
        <button className="ghost" onClick={() => setReporting(true)}>Report</button>
      </header>

      <div className="card-area">
        <Card
          key={current.card_id}
          tag={current.tag_slug}
          title={current.prompt}
          option_a={current.option_a}
          option_b={current.option_b}
          cardRef={cardRef}
          bind={reveal ? {} : bind}
        />
        {reveal && <RevealPanel result={reveal} onNext={next} />}
      </div>

      <TapButtons onChoice={onChoice} onSkip={onSkip} disabled={Boolean(reveal)} />
      {reporting && <ReportSheet postId={current.post_id} onClose={() => setReporting(false)} />}
      <BottomNav />
    </main>
  )
}