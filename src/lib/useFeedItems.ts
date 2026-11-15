import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage, type FeedItem } from './api';

/**
 * Loads the For You feed and appends more on demand.
 * get_feed already hides Splits you chose on or skipped, so the only dedupe needed is
 * against cards still sitting in the local deck that you haven't acted on yet.
 */
export function useFeedItems(batchSize = 20) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const itemsRef = useRef<FeedItem[]>([]);
  itemsRef.current = items;

  const loadMore = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const batch = await api.feed(batchSize);
      const known = new Set(itemsRef.current.map((i) => i.card_id));
      const fresh = batch.filter((i) => !known.has(i.card_id));
      if (fresh.length === 0) setExhausted(true);
      else setItems((prev) => [...prev, ...fresh]);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [batchSize]);

  useEffect(() => {
    void loadMore();
  }, [loadMore]);

  return { items, loading, exhausted, error, loadMore };
}
