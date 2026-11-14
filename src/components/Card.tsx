import type { Split } from '../lib/types'

type Props = {
  split: Split
  cardRef: React.RefObject<HTMLDivElement>
  bind: React.HTMLAttributes<HTMLDivElement>
}

export function Card({ split, cardRef, bind }: Props) {
  return (
    <div className="card" ref={cardRef} {...bind}>
      {split.tags[0] && <span className="tag">{split.tags[0]}</span>}
      <p className="prompt">{split.prompt_a}</p>
      <span className="or">or</span>
      <p className="prompt">{split.prompt_b}</p>
      <div className="hints">
        <span>← A</span>
        <span>↑ Skip</span>
        <span>B →</span>
      </div>
    </div>
  )
}