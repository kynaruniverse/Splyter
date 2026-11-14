import { create } from 'zustand'
import type { Side } from '../lib/types'

export type Phase = 'idle' | 'dragging' | 'committed' | 'revealed'

type SwipeState = {
  phase: Phase
  axis: 'x' | 'y' | null
  pendingChoice: Side | null
  beginDrag: () => void
  lockAxis: (axis: 'x' | 'y') => void
  commit: (choice: Side) => void
  skip: () => void
  reveal: () => void
  reset: () => void
}

// dx/dy are deliberately absent: pointer moves write to a ref and a CSS
// transform, so a drag doesn't re-render React.
export const useSwipeStore = create<SwipeState>((set) => ({
  phase: 'idle',
  axis: null,
  pendingChoice: null,
  beginDrag: () => set((s) => (s.phase === 'idle' ? { phase: 'dragging' } : s)),
  lockAxis: (axis) => set({ axis }),
  commit: (choice) => set({ phase: 'committed', pendingChoice: choice }),
  skip: () => set({ phase: 'committed', pendingChoice: null }),
  reveal: () => set({ phase: 'revealed' }),
  reset: () => set({ phase: 'idle', axis: null, pendingChoice: null }),
}))