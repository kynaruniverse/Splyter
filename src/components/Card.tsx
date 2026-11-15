type Props = {
  tag?: string | null
  title?: string | null
  option_a: string
  option_b: string
  cardRef: React.RefObject<HTMLDivElement>
  bind: React.HTMLAttributes<HTMLDivElement>
}

export function Card({ tag, title, option_a, option_b, cardRef, bind }: Props) {
  return (
    <div className="card" ref={cardRef} {...bind}>
      {tag && <span className="tag">{tag}</span>}
      {title && <p className="card-title">{title}</p>}
      <p className="prompt">{option_a}</p>
      <span className="or">or</span>
      <p className="prompt">{option_b}</p>
      <div className="hints">
        <span>← A</span>
        <span>↑ Skip</span>
        <span>B →</span>
      </div>
    </div>
  )
}