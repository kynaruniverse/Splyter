import type { Side } from '../lib/types'

export function TapButtons({
  onChoice,
  onSkip,
  disabled,
}: {
  onChoice: (side: Side) => void
  onSkip: () => void
  disabled: boolean
}) {
  return (
    <div className="tap-buttons">
      <button onClick={() => onChoice('a')} disabled={disabled} aria-label="Pick A">
        A
      </button>
      <button onClick={onSkip} disabled={disabled} aria-label="Skip">
        ↑
      </button>
      <button onClick={() => onChoice('b')} disabled={disabled} aria-label="Pick B">
        B
      </button>
    </div>
  )
}