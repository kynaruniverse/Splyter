import { useEffect, useRef, useState } from 'react';
import { useSwipe } from '../gesture/useSwipe';
import { directionToSide } from '../gesture/swipe-engine';
import type { CommitInfo, Direction, MoveInfo, Side } from '../gesture/swipe-engine';
import { api, errorMessage, type FeedItem, type FriendChoice, type SplitResult } from '../lib/api';

interface Props {
  /** Render this only once `items` is non-empty: the swipe engine attaches on first mount. */
  items: FeedItem[];
  /** False while the deck is mounted but hidden (another tab is showing): ignores the keyboard. */
  active?: boolean;
  /** Fired when the deck is within 3 cards of its end. */
  onNeedMore?: () => void;
  /** Fired once the server has accepted a choice. */
  onChoice?: (item: FeedItem, side: Side) => void;
  /** Stop vertical paging (used when onboarding has enough choices). */
  lockForward?: boolean;
  /** Show follow / remix actions on the reveal (needs a full account). */
  canAct?: boolean;
  onRemix?: (item: FeedItem) => void;
  onFollow?: (item: FeedItem) => void;
}

interface Local {
  side: Side;
  result?: SplitResult;
  friends?: FriendChoice[];
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Animated count-up for the reveal percentage. */
function useCountUp(target: number | null, ms = 450): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === null) {
      setValue(0);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

/** Under this many votes we show an invitation instead of a percentage. */
const MIN_VOTES_FOR_PERCENT = 10;

function Reveal({ item, local, canAct, onRemix, onFollow }: { item: FeedItem; local: Local; canAct?: boolean; onRemix?: (i: FeedItem) => void; onFollow?: (i: FeedItem) => void }) {
  const { result, side } = local;
  const total = result?.total_votes ?? 0;
  const enough = !!result && total >= MIN_VOTES_FOR_PERCENT;
  const pctA = enough ? Math.round((100 * result!.a_votes) / total) : null;
  const shownA = useCountUp(pctA);
  const mine = pctA === null ? null : side === 'a' ? pctA : 100 - pctA;
  const label =
    mine === null
      ? result
        ? 'Be one of the first to split this.'
        : 'Counting the split…'
      : mine < 50
        ? `You're in the ${mine}% minority.`
        : mine === 50
          ? "It's a perfect 50/50."
          : `You're with the ${mine}% majority.`;

  return (
    <div className="reveal">
      <div className="you">
        You chose <b>{side === 'a' ? item.option_a : item.option_b}</b>
      </div>
      <div className="bar">
        <div className="fillA" style={{ width: pctA === null ? '0%' : `${pctA}%` }} />
      </div>
      <div className="bar-labels">
        <span>
          {item.option_a} {pctA !== null && <b>{shownA}%</b>}
        </span>
        <span>
          {item.option_b} {pctA !== null && <b>{100 - shownA}%</b>}
        </span>
      </div>
      <div className="label">{label}</div>
      {local.friends && local.friends.length > 0 && (
        <div className="friends">
          {local.friends.map((f) => (
            <span key={f.friend_id} className="avatar" style={{ background: f.friend_color ?? '#667' }} title={`@${f.friend_handle ?? ''} chose ${f.friend_side.toUpperCase()}`}>
              {(f.friend_handle ?? '?')[0]?.toUpperCase()}
              <small>{f.friend_side.toUpperCase()}</small>
            </span>
          ))}
        </div>
      )}
      {canAct && (
        <div className="actions">
          <button className="ghost" onClick={() => onRemix?.(item)}>
            I'd flip it
          </button>
          <button className="ghost" onClick={() => onFollow?.(item)}>
            Follow @{item.creator_handle ?? 'creator'}
          </button>
        </div>
      )}
    </div>
  );
}

export function PlayDeck({ items, active = true, onNeedMore, onChoice, lockForward, canAct, onRemix, onFollow }: Props) {
  const [index, setIndex] = useState(0);
  const [locals, setLocals] = useState<Record<string, Local>>({});
  const [toast, setToast] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const busy = useRef(false);
  const shownAt = useRef(performance.now());

  const item: FeedItem | undefined = items[index];
  const local = item ? locals[item.card_id] : undefined;

  const allowed: Direction[] = [];
  if (item && !lockForward && index < items.length - 1) allowed.push('up');
  if (index > 0) allowed.push('down');
  if (item && !local) allowed.push('left', 'right');

  // --- card animation helpers (direct style writes; no React state per pointer move) ---
  const settleBack = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = 'transform 0.2s ease-out';
    el.style.transform = '';
    el.querySelectorAll<HTMLElement>('.tint').forEach((t) => (t.style.opacity = '0'));
  };

  const choose = (side: Side) => {
    if (!item || locals[item.card_id] || busy.current) return;
    const target = item;
    // Optimistic: the reveal shows instantly, the numbers arrive when the server answers.
    setLocals((l) => ({ ...l, [target.card_id]: { side } }));
    settleBack();
    api
      .castChoice(target.card_id, side)
      .then((result) => {
        setLocals((l) => ({ ...l, [target.card_id]: { ...l[target.card_id], side, result } }));
        onChoice?.(target, side);
        if (canAct) {
          api
            .friendChoices(target.card_id)
            .then((friends) => setLocals((l) => (l[target.card_id] ? { ...l, [target.card_id]: { ...l[target.card_id], friends } } : l)))
            .catch(() => {});
        }
      })
      .catch((e) => {
        // Roll the optimistic choice back so the user can try again.
        setLocals((l) => {
          const { [target.card_id]: _gone, ...rest } = l;
          return rest;
        });
        setToast(errorMessage(e));
      });
  };

  const go = async (dir: 'up' | 'down') => {
    if (busy.current || !item) return;
    if (dir === 'down' && index === 0) return settleBack();
    if (dir === 'up' && index >= items.length - 1) return settleBack();
    busy.current = true;
    if (dir === 'up' && !local) {
      // A skip only counts when no choice was made. "Early" = within 1 s of the card becoming visible.
      api.recordSkip(item.post_id, performance.now() - shownAt.current < 1000).catch(() => {});
    }
    const el = cardRef.current;
    if (el) {
      el.style.transition = 'transform 0.18s ease-in';
      el.style.transform = `translateY(${dir === 'up' ? '-110%' : '110%'})`;
    }
    await sleep(190);
    setIndex((i) => (dir === 'up' ? i + 1 : i - 1));
    if (el) {
      el.style.transition = 'none';
      el.style.transform = `translateY(${dir === 'up' ? '110%' : '-110%'})`;
      void el.offsetHeight; // force reflow so the slide-in transition runs
      el.style.transition = 'transform 0.2s ease-out';
      el.style.transform = '';
    }
    await sleep(200);
    busy.current = false;
  };

  const surfaceRef = useSwipe(
    {
      onLock: () => {
        if (cardRef.current) cardRef.current.style.transition = 'none';
      },
      onMove: (info: MoveInfo) => {
        const el = cardRef.current;
        if (!el) return;
        el.style.transform = `translate(${info.dx}px, ${info.dy}px) rotate(${info.dx / 24}deg)`;
        const a = el.querySelector<HTMLElement>('.tint.a');
        const b = el.querySelector<HTMLElement>('.tint.b');
        if (a) a.style.opacity = info.direction === 'left' && info.allowed ? String(info.progress * 0.6) : '0';
        if (b) b.style.opacity = info.direction === 'right' && info.allowed ? String(info.progress * 0.6) : '0';
      },
      onCommit: (info: CommitInfo) => {
        const side = directionToSide(info.direction);
        if (side) choose(side);
        else void go(info.direction === 'up' ? 'up' : 'down');
      },
      onCancel: settleBack,
    },
    allowed,
  );

  // A new card became visible: count the impression and restart the "first second" clock.
  const visiblePost = item?.post_id;
  useEffect(() => {
    if (!visiblePost) return;
    shownAt.current = performance.now();
    api.recordView(visiblePost).catch(() => {});
  }, [visiblePost]);

  // Ask for more when the deck is nearly used up.
  useEffect(() => {
    if (items.length > 0 && items.length - index <= 3) onNeedMore?.();
  }, [index, items.length, onNeedMore]);

  // Keyboard and tap equivalents for every swipe.
  useEffect(() => {
    const map: Record<string, Direction> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    const onKey = (e: KeyboardEvent) => {
      const dir = map[e.key];
      if (!active || !dir || !allowed.includes(dir)) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      const side = directionToSide(dir);
      if (side) choose(side);
      else void go(dir === 'up' ? 'up' : 'down');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  if (!item) return <div className="empty">Nothing to show yet.</div>;

  return (
    <div className="deck">
      <div className="stage" ref={surfaceRef}>
        <div className="card" ref={cardRef}>
          <div className="meta">
            <span>#{item.tag_slug}</span>
            {item.remix_of_post_id && <span>remix</span>}
            <span>@{item.creator_handle ?? 'splyter'}</span>
          </div>
          <div className="prompt">{item.prompt}</div>
          {local ? (
            <Reveal item={item} local={local} canAct={canAct} onRemix={onRemix} onFollow={onFollow} />
          ) : (
            <div className="opts">
              <div className="opt a">
                <small>&larr; A</small>
                {item.option_a}
              </div>
              <div className="opt b">
                <small>B &rarr;</small>
                {item.option_b}
              </div>
            </div>
          )}
          <div className="tint a" />
          <div className="tint b" />
        </div>
      </div>
      <div className="hint">Swipe left for A, right for B, up for next. Or use the buttons.</div>
      <div className="buttons">
        <button className="btn-a" disabled={!!local} onClick={() => choose('a')}>
          A: {item.option_a}
        </button>
        <button className="btn-b" disabled={!!local} onClick={() => choose('b')}>
          B: {item.option_b}
        </button>
      </div>
      <div className="buttons">
        <button className="ghost" disabled={!allowed.includes('down')} onClick={() => void go('down')}>
          Back
        </button>
        <button className="ghost" disabled={!allowed.includes('up')} onClick={() => void go('up')}>
          {local ? 'Next' : 'Skip'}
        </button>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
