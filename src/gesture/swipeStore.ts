import { create } from 'zustand';
import type { Axis, Side } from './swipe-engine';

/**
 * Local gesture state. Per-pixel drag offsets deliberately do NOT live here:
 * write them straight to the card's transform from the engine's onMove.
 *
 * `side` is always 'a' | 'b', never a direction, so tap buttons, keyboard and
 * swipes all write the same data.
 */
export type Phase = 'idle' | 'dragging' | 'committed' | 'revealed';

interface SwipeState {
  phase: Phase;
  axis: Axis | null;
  /** Choice applied optimistically, waiting for the server to confirm. */
  pendingChoice: { cardId: string; side: Side } | null;
  /** Local record of choices by card id (source of truth is the choices table). */
  choices: Record<string, Side>;
  skips: number;

  lock: (axis: Axis) => void;
  cancel: () => void;
  commitChoice: (cardId: string, side: Side) => void;
  confirmChoice: (cardId: string) => void;
  rollbackChoice: (cardId: string) => void;
  registerSkip: () => void;
  nextCard: () => void;
}

export const useSwipeStore = create<SwipeState>((set) => ({
  phase: 'idle',
  axis: null,
  pendingChoice: null,
  choices: {},
  skips: 0,

  lock: (axis) => set({ phase: 'dragging', axis }),
  cancel: () => set({ phase: 'idle', axis: null }),

  // Optimistic: show the reveal immediately, reconcile with the server afterwards.
  commitChoice: (cardId, side) =>
    set((s) => ({
      phase: 'revealed',
      axis: null,
      pendingChoice: { cardId, side },
      choices: { ...s.choices, [cardId]: side },
    })),
  confirmChoice: (cardId) =>
    set((s) => (s.pendingChoice?.cardId === cardId ? { pendingChoice: null } : s)),
  rollbackChoice: (cardId) =>
    set((s) => {
      const { [cardId]: _removed, ...rest } = s.choices;
      return { choices: rest, pendingChoice: null, phase: 'idle' };
    }),

  // Call only when the user swipes up on a card with no choice made.
  registerSkip: () => set((s) => ({ skips: s.skips + 1, phase: 'idle', axis: null })),
  nextCard: () => set({ phase: 'idle', axis: null }),
}));
