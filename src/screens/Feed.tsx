import { useState } from 'react';
import { PlayDeck } from '../components/PlayDeck';
import { useFeedItems } from '../lib/useFeedItems';
import { api, errorMessage, type FeedItem } from '../lib/api';

export function Feed({ userId, active, onRemix }: { userId: string; active: boolean; onRemix: (item: FeedItem) => void }) {
  const { items, loading, exhausted, error, loadMore } = useFeedItems(20);
  const [note, setNote] = useState<string | null>(null);

  const follow = async (item: FeedItem) => {
    try {
      await api.follow(item.creator_id, userId);
      setNote(`Following @${item.creator_handle ?? 'creator'}`);
    } catch (e) {
      setNote(errorMessage(e));
    }
    setTimeout(() => setNote(null), 2500);
  };

  if (loading) return <div className="screen center">Loading…</div>;
  if (items.length === 0) {
    return (
      <div className="screen center">
        <h2>You're all caught up</h2>
        <p className="tagline">{error ?? "No new Splits right now. Why not make one?"}</p>
        <button className="secondary" onClick={() => void loadMore()}>
          Check again
        </button>
      </div>
    );
  }

  return (
    <div className="screen">
      <PlayDeck items={items} active={active} onNeedMore={exhausted ? undefined : loadMore} canAct onRemix={onRemix} onFollow={follow} />
      {note && <div className="toast">{note}</div>}
    </div>
  );
}
