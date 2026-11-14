import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchResults, fetchSplit } from '../lib/api'
import type { Split } from '../lib/types'

// Stub: read-only Split page for shared links. Voting here lands in the
// same anonymous-then-upgrade path as the app.
export function PublicSplit() {
  const { id } = useParams()
  const [split, setSplit] = useState<Split | null>(null)
  const [results, setResults] = useState<{ a: number; b: number } | null>(null)

  useEffect(() => {
    if (!id) return
    fetchSplit(id).then(setSplit).catch(() => setSplit(null))
    fetchResults(id).then(setResults).catch(() => setResults(null))
  }, [id])

  if (!split) return <p className="hint">Split not found.</p>

  return (
    <main className="stack">
      <div className="card static">
        <p className="prompt">{split.prompt_a}</p>
        <span className="or">or</span>
        <p className="prompt">{split.prompt_b}</p>
      </div>
      {results && (
        <p className="hint">
          Live: A {results.a} · B {results.b}
        </p>
      )}
      <p className="hint">Voting from shared links is the next piece to wire up.</p>
    </main>
  )
}