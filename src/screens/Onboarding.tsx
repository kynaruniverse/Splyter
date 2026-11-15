import { useState } from 'react';
import { PlayDeck } from '../components/PlayDeck';
import { useFeedItems } from '../lib/useFeedItems';

/** The first 5 Splits, played as an anonymous user. Choices are saved against the anonymous account. */
export function Onboarding({ alreadyChosen, goal = 5, onDone }: { alreadyChosen: number; goal?: number; onDone: (chosen: number) => void }) {
  const { items, loading, error } = useFeedItems(10);
  const [chosen, setChosen] = useState(alreadyChosen);
  const done = chosen >= goal;

  if (loading) return <div className="screen center">Loading…</div>;
  if (items.length === 0) {
    return (
      <div className="screen center">
        <p>{error ?? 'There are no Splits to play yet.'}</p>
        <button className="primary" onClick={() => onDone(chosen)}>
          Continue to sign up
        </button>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="topbar">
        <span>
          {Math.min(chosen, goal)} / {goal}
        </span>
        <button className="link" onClick={() => onDone(chosen)}>
          Sign up now
        </button>
      </header>
      <PlayDeck items={items} lockForward={done} onChoice={() => setChosen((c) => c + 1)} />
      {done && (
        <button className="primary sticky" onClick={() => onDone(chosen)}>
          See your Splyter profile — sign up
        </button>
      )}
    </div>
  );
}
