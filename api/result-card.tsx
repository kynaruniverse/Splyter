// api/result-card.tsx
// Vercel Node function. .tsx so Satori can take JSX directly.
// Renders a shareable PNG for a revealed Daily Split.
import type { VercelRequest, VercelResponse } from '@vercel/node'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { adminSupabase } from './_supabase'

// Vendor this font: put a .ttf at api/fonts/Inter-Bold.ttf.
// Satori has no system fonts — without this the function 500s.
let fontCache: Buffer | null = null
function loadFont() {
  if (!fontCache) {
    fontCache = readFileSync(join(process.cwd(), 'api/fonts/Inter-Bold.ttf'))
  }
  return fontCache
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const day = String(req.query.day ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return res.status(400).json({ error: 'day must be YYYY-MM-DD' })
  }

  const db = adminSupabase()

  const { data: slot, error: slotErr } = await db
    .from('daily_splits')
    .select('post_id, day')
    .eq('day', day)
    .maybeSingle()
  if (slotErr) return res.status(500).json({ error: slotErr.message })
  if (!slot) return res.status(404).json({ error: 'No Daily Split for that day' })

  const { data: post, error: postErr } = await db
    .from('posts')
    .select('prompt_a, prompt_b, counts_a, counts_b')
    .eq('id', slot.post_id)
    .maybeSingle()
  if (postErr) return res.status(500).json({ error: postErr.message })
  if (!post) return res.status(404).json({ error: 'Post missing' })

  const total = post.counts_a + post.counts_b
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100))
  const a = pct(post.counts_a)
  const b = pct(post.counts_b)

  const svg = await satori(
    <div
      style={{
        width: 1200, height: 630, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: 64,
        background: '#0e0f13', color: '#f2f3f7', fontFamily: 'Inter',
      }}
    >
      <div style={{ fontSize: 28, color: '#8b90a0' }}>Splyter · Daily Split · {day}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.15 }}>{post.prompt_a}</div>
        <div style={{ fontSize: 28, color: '#8b90a0' }}>or</div>
        <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.15 }}>{post.prompt_b}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ width: `${a}%`, background: '#4f8cff' }} />
          <div style={{ width: `${b}%`, background: '#ff7a59' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 36 }}>
          <span>{a}% A</span>
          <span style={{ color: '#8b90a0', fontSize: 24 }}>{total} votes</span>
          <span>{b}% B</span>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Inter', data: loadFont(), weight: 700, style: 'normal' }],
    },
  )

  const png = new Resvg(svg).render().asPng()

  // Revealed results are immutable, so cache hard at the CDN.
  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=31536000, immutable')
  return res.status(200).send(png)
}