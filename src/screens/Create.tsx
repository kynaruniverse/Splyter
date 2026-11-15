import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage, type FeedItem } from '../lib/api';

/** Create a Dilemma. A live preview sits above the fields. Remixing prefills from the parent Split. */
export function Create({ remixOf, onDone }: { remixOf: FeedItem | null; onDone: () => void }) {
  const qc = useQueryClient();
  const tags = useQuery({ queryKey: ['tags'], queryFn: api.tags, staleTime: Infinity });
  const [prompt, setPrompt] = useState(remixOf?.prompt ?? '');
  const [a, setA] = useState(remixOf?.option_a ?? '');
  const [b, setB] = useState(remixOf?.option_b ?? '');
  const [tag, setTag] = useState(remixOf?.tag_slug ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = prompt.trim() && a.trim() && b.trim() && tag;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.createDilemma({ prompt, a, b, tag, remixOf: remixOf?.post_id });
      await qc.invalidateQueries({ queryKey: ['mySplits'] });
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <h2>{remixOf ? "I'd flip it" : 'Drop a Split'}</h2>
      <div className="card preview">
        <div className="prompt">{prompt || 'Your dilemma goes here…'}</div>
        <div className="opts">
          <div className="opt a">
            <small>&larr; A</small>
            {a || 'Option A'}
          </div>
          <div className="opt b">
            <small>B &rarr;</small>
            {b || 'Option B'}
          </div>
        </div>
      </div>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <textarea placeholder="The dilemma" rows={3} maxLength={160} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <div className="counter">{prompt.length}/160</div>
        <input placeholder="Option A" maxLength={60} value={a} onChange={(e) => setA(e.target.value)} />
        <input placeholder="Option B" maxLength={60} value={b} onChange={(e) => setB(e.target.value)} />
        <div className="chips">
          {tags.data?.map((t) => (
            <button type="button" key={t.slug} className={t.slug === tag ? 'chip on' : 'chip'} onClick={() => setTag(t.slug)}>
              {t.label}
            </button>
          ))}
        </div>
        <button className="primary" disabled={busy || !valid}>
          Publish
        </button>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}
