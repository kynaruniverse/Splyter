import { useCallback, useRef } from 'react'
import type { Side } from '../lib/types'
import { useSwipeStore } from '../store/swipe'

// These match the prototype defaults you signed off. If you tuned the
// sliders to different numbers, change them here and nowhere else.
export const SWIPE = {
  axisLockPx: 10,
  horizontal: 0.3, // fraction of card width
  vertical: 0.25, // fraction of card height
} as const

type Handlers = {
  onChoice: (side: Side) => void
  onSkip: () => void
  onBack: () => void
}

export function useSwipe(handlers: Handlers) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const start = useRef({ x: 0, y: 0 })
  const delta = useRef({ x: 0, y: 0 })
  const active = useRef(false)

  const transform = useCallback((x: number, y: number, animate = false) => {
    const el = cardRef.current
    if (!el) return
    el.style.transition = animate
      ? 'transform 180ms cubic-bezier(.2,.8,.2,1), opacity 180ms ease-out'
      : 'none'
    el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${x / 24}deg)`
    el.style.opacity = String(Math.max(0.35, 1 - Math.abs(x) / 900))
  }, [])

  const springBack = useCallback(() => {
    transform(0, 0, true)
    delta.current = { x: 0, y: 0 }
    useSwipeStore.getState().reset()
  }, [transform])

  const flyOut = useCallback(
    (dir: 'left' | 'right' | 'up') => {
      const el = cardRef.current
      const w = el?.offsetWidth ?? 400
      const h = el?.offsetHeight ?? 600
      if (dir === 'up') transform(0, -h * 1.2, true)
      else transform(dir === 'left' ? -w * 1.2 : w * 1.2, 0, true)
    },
    [transform],
  )

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const s = useSwipeStore.getState()
    if (s.phase === 'committed' || s.phase === 'revealed') return
    active.current = true
    start.current = { x: e.clientX, y: e.clientY }
    delta.current = { x: 0, y: 0 }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    useSwipeStore.getState().beginDrag()
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!active.current) return
    const store = useSwipeStore.getState()
    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y
    delta.current = { x: dx, y: dy }

    if (!store.axis) {
      if (Math.hypot(dx, dy) < SWIPE.axisLockPx) return
      store.lockAxis(Math.abs(dx) > Math.abs(dy) ? 'x' : 'y')
    }
    if (useSwipeStore.getState().axis === 'x') transform(dx, 0)
    else transform(0, dy)
  }, [transform])

  const onPointerUp = useCallback(() => {
    if (!active.current) return
    active.current = false

    const store = useSwipeStore.getState()
    if (store.phase === 'committed' || store.phase === 'revealed') return

    const el = cardRef.current
    const w = el?.offsetWidth ?? 400
    const h = el?.offsetHeight ?? 600
    const { x, y } = delta.current

    if (store.axis === 'x' && Math.abs(x) > w * SWIPE.horizontal) {
      const side: Side = x < 0 ? 'a' : 'b' // left = A, right = B
      store.commit(side)
      flyOut(x < 0 ? 'left' : 'right')
      handlers.onChoice(side)
      return
    }

    // Up is only ever a skip, and only before a choice exists.
    if (store.axis === 'y' && y < -h * SWIPE.vertical && !store.pendingChoice) {
      store.skip()
      flyOut('up')
      handlers.onSkip()
      return
    }

    if (store.axis === 'y' && y > h * SWIPE.vertical * 0.6) {
      springBack()
      handlers.onBack()
      return
    }

    springBack()
  }, [flyOut, handlers, springBack])

  return {
    cardRef,
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  }
}