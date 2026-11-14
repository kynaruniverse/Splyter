// src/routes/Create.tsx — replaces the stub
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { useSession } from '../hooks/useSession'
import { createSplit } from '../lib/api'
import { LIMITS, TAGS, type Tag } from '../lib/tags'

type Draft = { prompt_a: string; prompt_b: string; tag: Tag | null }

const EMPTY: Draft = { prompt_a: '', prompt_b: '', tag: null }

export function Create() {
  const navigate = useNavigate()
  const session = useSession()
  const draftKey = `splyter:draft:${session?.user.id ?? 'anon'}`

  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [publishedId, setPublishedId] = useState<string | null>(null)

  // Local draft only. Nothing is written to the server until publish,
  // so a half-written Split never enters the feed or the ranking.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (raw) setDraft({ ...EMPTY, ...JSON.parse(raw) })
    } catch {
      /* ignore a corrupt draft */
    }
  }, [draftKey])

  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft))
    } catch {
      /* storage full or blocked; the draft just doesn't persist */
    }
  }, [draft, draftKey])

  const problems = useMemo(() => {
    const out: string[] = []
    const a = draft.prompt_a.trim()
    const b = draft.prompt_b.trim()
    if (!a) out.push('First option is empty')
    if (!b) out.push('Second option is empty')
    if (a && b && a.toLowerCase() === b.toLowerCase()) out.push('The two options are identical')
    if (!draft.tag) out.push('Pick a tag')
    return out
  }, [draft])

  const canPublish = problems.length === 0 && !busy && !publishedId

  async function publish() {
    if (!canPublish || !draft.tag) return
    setBusy(true)
    setError(null)
    try {
      const id = await createSplit({
        prompt_a: draft.prompt_a.trim(),
        prompt_b: draft.prompt_b.trim(),
        tag: draft.tag,
      })
      localStorage.removeItem(draftKey)
      setPublishedId(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not publish')
    } finally {
      setBusy(false)
    }
  }

  if (publishedId) {
    const shareUrl = `${window.location.origin}/split/${publishedId}`
    return (
      <main className="stack">
        <div className="gate">
          <h1>It's live</h1>
          <p className="hint">Your Split is in the feed. Votes are real from the first one.</p>
          <button
            className="primary"
            onClick={() => navigator.clipboard?.writeText(shareUrl).catch(() => {})}
          >
            Copy share link
          </button>
          <button
            className="secondary"
            onClick={() => {
              setDraft(EMPTY)
              setPublishedId(null)
            }}
          >
            Write another
          </button>
          <button className="ghost" onClick={() => navigate('/feed')}>
            Back to feed
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="stack">
      <header className="topbar">
        <h1 className="brand">New Split</h1>
      </header>

      <label>
        Option A
        <input
          value={draft.prompt_a}
          maxLength={LIMITS.prompt}
          onChange={(e) => setDraft((d) => ({ ...d, prompt_a: e.target.value }))}
        />
        <span className="hint counter">
          {draft.prompt_a.length} / {LIMITS.prompt}
        </span>
      </label>

      <p className="or">or</p>

      <label>
        Option B
        <input
          value={draft.prompt_b}
          maxLength={LIMITS.prompt}
          onChange={(e) => setDraft((d) => ({ ...d, prompt_b: e.target.value }))}
        />
        <span className="hint counter">
          {draft.prompt_b.length} / {LIMITS.prompt}
        </span>
      </label>

      <fieldset className="tag-grid">
        <legend>Tag</legend>
        {TAGS.map((t) => (
          <button
            key={t}
            type="button"
            className={draft.tag === t ? 'chip chip-on' : 'chip'}
            onClick={() => setDraft((d) => ({ ...d, tag: t }))}
          >
            {t}
          </button>
        ))}
      </fieldset>

      {/* Preview: exactly what the card will look like, no votes implied. */}
      <div className="card static preview">
        {draft.tag && <span className="tag">{draft.tag}</span>}
        <p className="prompt">{draft.prompt_a.trim() || 'Option A'}</p>
        <span className="or">or</span>
        <p className="prompt">{draft.prompt_b.trim() || 'Option B'}</p>
      </div>

      {problems.length > 0 && (
        <ul className="hint problems">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {error && <p className="error">{error}</p>}

      <button className="primary" disabled={!canPublish} onClick={publish}>
        {busy ? 'Publishing…' : 'Publish'}
      </button>
      <p className="hint">Published Splits can be deleted but not edited.</p>

      <BottomNav />
    </main>
  )
}