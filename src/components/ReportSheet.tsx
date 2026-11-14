import { useState } from 'react'
import { reportSplit } from '../lib/api'

const reasons = ['Harmful or hateful', 'Misleading', 'Spam', 'Something else']

export function ReportSheet({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(reason: string) {
    try {
      await reportSplit(postId, reason)
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
          reasons.map((r) => (
            <button key={r} className="sheet-option" onClick={() => send(r)}>
              {r}
            </button>
          ))
        )}
        {error && <p className="error">{error}</p>}
        <button className="ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}