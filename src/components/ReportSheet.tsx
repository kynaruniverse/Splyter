import { useState } from 'react'
import { reportPost } from '../lib/api'

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'sexual', label: 'Sexual content' },
  { value: 'self_harm', label: 'Self-harm' },
  { value: 'other', label: 'Something else' },
] as const

export function ReportSheet({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(reason: string) {
    try {
      await reportPost(postId, reason)
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Report failed')
    }
  }

  return (
    <div className="sheet" role="dialog" aria-label="Report this Split">
      <div className="sheet-inner">
        <h2>Report</h2>
        {sent ? (
          <p>Thanks — this is with the moderators.</p>
        ) : (
          REASONS.map((r) => (
            <button key={r.value} className="sheet-option" onClick={() => send(r.value)}>
              {r.label}
            </button>
          ))
        )}
        {error && <p className="error">{error}</p>}
        <button className="ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}