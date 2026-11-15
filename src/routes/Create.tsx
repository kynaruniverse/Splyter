import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { useSession } from '../hooks/useSession'
import { createDilemma, fetchTags } from '../lib/api'
import type { Tag } from '../lib/types'

type Draft = {
  prompt: string
  option_a: string
  option_b: string
  tag_slug: string
}

const EMPTY: Draft = { prompt: '', option_a: '', option_b: '', tag_slug: '' }
const LIMITS = { prompt: 160, option: 60 }

export function Create() {
  const navigate = useNavigate()
  const session = useSession()
  const draftKey = `splyter:draft:${session?.user.id ?? 'anon'}`

  const [tags, setTags] = useState<Tag[]>([])
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [publishedId, setPublishedId] = useState<string | null>(null)

  useEffect(() => {
    fetchTags().then(setTags).catch(() => setTags([]))
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (raw) setDraft({ ...EMPTY, ...JSON.parse(raw) })
    } catch {}
  }, [draftKey])

  useEffect(() => {
    try { localStorage.setItem(draftKey, JSON.stringify(draft)) } catch {}
  }, [draft, draftKey])

  const problems = useMemo(() => {
    const out: string[] = []
    const p = draft.prompt.trim()
    const a = draft.option_a.trim()
    const b = draft.option_b.trim()
    if (!p) out.push('Prompt is empty')
    if (!a) out.push('Option A is empty')
    if (!b) out.push('Option B is empty')
    if (!draft.tag_slug) out.push('Pick a tag')
    if (a && b && a.toLowerCase() === b.toLowerCase()) out.push('Options are identical')
    return out
  }, [draft])

  const canPublish = problems.length === 0 && !busy && !publishedId

  async function publish() {
    if (!canPublish) return
    setBusy(true)
    setError(null)
    try {
      const id = await createDilemma({
        prompt: draft.prompt.trim(),
        option_a: draft.option_a.trim(),
        option_b: draft.option_b.trim(),
        tag_slug: draft.tag_slug,
      })
      localStorage.removeItem(draftKey)
      setPublishedId(id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not publish'
      setError(msg.replace(/^\w+:\s*/, ''))
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
          <p className="hint">Your Split is in the feed.</p>
          <button className="primary" onClick={() => navigator.clipboard?.writeText(shareUrl).catch(() => {})}>
            Copy share link
          </button>
          <button className="secondary" onClick={() => { setDraft(EMPTY); setPublishedId(null) }}>
            Write another
          </button>
          <button className="ghost" onClick={() => navigate('/feed')}>Back to feed</button>
        </div>
        <BottomNav />
      </main>
    )
  }

  return (
    <main className="stack">
      <header className="topbar"><h1 className="brand">New Split</h1></header>

      <label>
        Prompt
        <input
          value={draft.prompt}
          maxLength={LIMITS.prompt}
          onChange={(e) => setDraft((d) => ({ ...d, prompt: e.target.value }))}
          placeholder="The question"
        />
        <span className="hint counter">{draft.prompt.length} / {LIMITS.prompt}</span>
      </label>

      <label>
        Option A
        <input
          value={draft.option_a}
          maxLength={LIMITS.option}
          onChange={(e) => setDraft((d) => ({ ...d, option_a: e.target.value }))}
        />
        <span className="hint counter">{draft.option_a.length} / {LIMITS.option}</span>
      </label>

      <p className="or">or</p>

      <label>
        Option B
        <input
          value={draft.option_b}
          maxLength={LIMITS.option}
          onChange={(e) => setDraft((d) => ({ ...d, option_b: e.target.value }))}
        />
        <span className="hint counter">{draft.option_b.length} / {LIMITS.option}</span>
      </label>

      <fieldset className="tag-grid">
        <legend>Tag</legend>
        {tags.map((t) => (
          <button
            key={t.slug}
            type="button"
            className={draft.tag_slug === t.slug ? 'chip chip-on' : 'chip'}
            onClick={() => setDraft((d) => ({ ...d, tag_slug: t.slug }))}
          >
            {t.label}
          </button>
        ))}
      </fieldset>

      <div className="card static preview">
        {draft.tag_slug && (
          <span className="tag">
            {tags.find((t) => t.slug === draft.tag_slug)?.label ?? draft.tag_slug}
          </span>
        )}
        <p className="card-title">{draft.prompt.trim() || 'Your prompt'}</p>
        <p className="prompt">{draft.option_a.trim() || 'Option A'}</p>
        <span className="or">or</span>
        <p className="prompt">{draft.option_b.trim() || 'Option B'}</p>
      </div>

      {problems.length > 0 && (
        <ul className="hint problems">
          {problems.map((p) => <li key={p}>{p}</li>)}
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