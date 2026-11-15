import { useEffect, useRef } from 'react';
import { SwipeEngine } from './swipe-engine';
import type { Direction, SwipeConfig, SwipeHandlers } from './swipe-engine';

/**
 * React wrapper around SwipeEngine. Attach the returned ref to the swipe surface.
 * Handlers are read through a ref, so changing them never recreates the engine.
 * Animate the card inside onMove with direct style/transform writes, not React state.
 */
export function useSwipe(
  handlers: SwipeHandlers,
  allowed: Direction[],
  config?: Partial<SwipeConfig>,
) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const engineRef = useRef<SwipeEngine | null>(null);

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const engine = new SwipeEngine(
      el,
      {
        onStart: () => handlersRef.current.onStart?.(),
        onLock: (axis) => handlersRef.current.onLock?.(axis),
        onMove: (info) => handlersRef.current.onMove?.(info),
        onCommit: (info) => handlersRef.current.onCommit?.(info),
        onCancel: () => handlersRef.current.onCancel?.(),
      },
      config,
    );
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allowedKey = allowed.join('|');
  useEffect(() => {
    engineRef.current?.setAllowed(allowed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedKey]);

  return surfaceRef;
}
