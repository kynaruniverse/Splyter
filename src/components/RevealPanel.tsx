import type { VoteResult } from '../lib/types'

type Props = {
  result: VoteResult
  onNext: () => void
}

export function RevealPanel({ result, onNext }: Props) {
  const pct = (n: number) => (result.total === 0 ? 0 : Math.round((n / result.total) * 100))
  return (
    <div className="reveal">
      {result.my_side && <p className="reveal-label">You picked {result.my_side.toUpperCase()}</p>}
      <div className="bar-row">
        <div className="bar bar-a" style={{ width: `${pct(result.a)}%` }} />
        <div className="bar bar-b" style={{ width: `${pct(result.b)}%` }} />
      </div>
      <p className="reveal-counts">
        A {pct(result.a)}% · B {pct(result.b)}% · {result.total} votes
      </p>
      <button className="primary" onClick={onNext}>Next</button>
    </div>
  )
}