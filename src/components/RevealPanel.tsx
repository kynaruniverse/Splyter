import type { Results, Side } from '../lib/types'

type Props = {
  choice: Side
  results: Results
  pending: boolean
  onNext: () => void
}

export function RevealPanel({ choice, results, pending, onNext }: Props) {
  const total = results.a + results.b
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100))

  return (
    <div className="reveal">
      <p className="reveal-label">You picked {choice.toUpperCase()}</p>
      <div className="bar-row">
        <div className="bar bar-a" style={{ width: `${pct(results.a)}%` }} />
        <div className="bar bar-b" style={{ width: `${pct(results.b)}%` }} />
      </div>
      <p className="reveal-counts">
        A {pct(results.a)}% · B {pct(results.b)}%
        {pending ? ' · counting' : ` · ${total} votes`}
      </p>
      <button className="primary" onClick={onNext}>
        Next
      </button>
    </div>
  )
}