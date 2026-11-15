import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type PublicData = {
  id: string
  title: string
  tag_slug: string
  body: string
  option_a: string
  option_b: string
}

export function PublicSplit() {
  const { id } = useParams()
  const [split, setSplit] = useState<PublicData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, tag_slug, status, cards(body, option_a_label, option_b_label, position)')
        .eq('id', id)
        .maybeSingle()
      if (error) return setError(error.message)
      if (!data || data.status !== 'published') return setError('Not found')
      const cards = (data as any).cards as any[]
      const first = cards?.find((c) => c.position === 0)
      if (!first) return setError('Not found')
      setSplit({
        id: data.id,
        title: data.title,
        tag_slug: data.tag_slug,
        body: first.body,
        option_a: first.option_a_label,
        option_b: first.option_b_label,
      })
    })()
  }, [id])

  if (error) return <p className="error">{error}</p>
  if (!split) return <p className="hint">Loading…</p>

  return (
    <main className="stack">
      <div className="card static">
        <span className="tag">{split.tag_slug}</span>
        <p className="card-title">{split.body}</p>
        <p className="prompt">{split.option_a}</p>
        <span className="or">or</span>
        <p className="prompt">{split.option_b}</p>
      </div>
      <p className="hint">Voting from shared links is coming soon.</p>
    </main>
  )
}