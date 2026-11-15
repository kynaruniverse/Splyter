/**
 * Splyter swipe engine: framework-free, dual-axis pointer gesture handling.
 *
 * Rules (from the decision log):
 * - Axis locks once the pointer moves `lockDistance` px, then the other axis is ignored.
 * - Left = option A, right = option B, up = next Split, down = previous Split.
 * - Directions can be disabled at runtime (e.g. no horizontal swipe after a choice).
 * - The engine only reports directions. Store `side` as 'a' | 'b' via directionToSide,
 *   never as a direction, so tap buttons and future layouts share the same data.
 */

export type Axis = 'x' | 'y';
export type Direction = 'left' | 'right' | 'up' | 'down';
export type Side = 'a' | 'b';

export interface SwipeConfig {
  /** Pointer travel (px) before the axis is chosen. */
  lockDistance: number;
  /** Fraction of element width needed to commit a horizontal swipe. */
  commitFractionX: number;
  /** Fraction of element height needed to commit a vertical swipe. */
  commitFractionY: number;
  /** Release speed (px/ms) that commits a short flick. */
  flickVelocity: number;
  /** Minimum travel (px) a flick must have to count. */
  flickMinDistance: number;
  /** Drag resistance (0-1) when dragging toward a disabled direction. */
  resistance: number;
}

export const defaultConfig: SwipeConfig = {
  lockDistance: 10,
  commitFractionX: 0.28,
  commitFractionY: 0.18,
  flickVelocity: 0.5,
  flickMinDistance: 24,
  resistance: 0.2,
};

export interface MoveInfo {
  axis: Axis;
  /** Horizontal offset in px (0 when axis is 'y'). */
  dx: number;
  /** Vertical offset in px (0 when axis is 'x'). */
  dy: number;
  /** 0-1 progress toward the commit threshold. */
  progress: number;
  /** Direction the drag currently points to. */
  direction: Direction;
  /** True when this direction is currently allowed. */
  allowed: boolean;
}

export interface CommitInfo {
  direction: Direction;
  /** performance.now() at the moment the commit was decided. */
  decidedAt: number;
  /** ms from pointerdown to the commit decision. */
  gestureMs: number;
  velocity: number;
  viaFlick: boolean;
}

export interface SwipeHandlers {
  onStart?: () => void;
  onLock?: (axis: Axis) => void;
  onMove?: (info: MoveInfo) => void;
  onCommit?: (info: CommitInfo) => void;
  onCancel?: () => void;
}

export function directionToSide(direction: Direction): Side | null {
  if (direction === 'left') return 'a';
  if (direction === 'right') return 'b';
  return null;
}

type Phase = 'idle' | 'pending' | 'dragging' | 'ignored';

interface Sample {
  x: number;
  y: number;
  t: number;
}

export class SwipeEngine {
  private el: HTMLElement;
  private handlers: SwipeHandlers;
  private config: SwipeConfig;
  private allowed = new Set<Direction>(['left', 'right', 'up', 'down']);

  private phase: Phase = 'idle';
  private axis: Axis = 'x';
  private pointerId = -1;
  private startX = 0;
  private startY = 0;
  private startT = 0;
  private samples: Sample[] = [];

  constructor(el: HTMLElement, handlers: SwipeHandlers, config: Partial<SwipeConfig> = {}) {
    this.el = el;
    this.handlers = handlers;
    this.config = { ...defaultConfig, ...config };
    this.el.style.touchAction = 'none';
    this.el.addEventListener('pointerdown', this.onDown);
    this.el.addEventListener('pointermove', this.onMove);
    this.el.addEventListener('pointerup', this.onUp);
    this.el.addEventListener('pointercancel', this.onCancel);
  }

  setAllowed(directions: Direction[]): void {
    this.allowed = new Set(directions);
  }

  setConfig(partial: Partial<SwipeConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  getConfig(): SwipeConfig {
    return { ...this.config };
  }

  destroy(): void {
    this.el.removeEventListener('pointerdown', this.onDown);
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerup', this.onUp);
    this.el.removeEventListener('pointercancel', this.onCancel);
  }

  private onDown = (e: PointerEvent): void => {
    if (this.phase !== 'idle') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.pointerId = e.pointerId;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startT = performance.now();
    this.samples = [{ x: e.clientX, y: e.clientY, t: this.startT }];
    this.phase = 'pending';
    // Capture is deferred until a drag actually starts (see onMove). Capturing on pointerdown
    // would retarget the following `click` to this element, breaking buttons inside the card.
    this.handlers.onStart?.();
  };

  private onMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId || this.phase === 'idle' || this.phase === 'ignored') return;
    const now = performance.now();
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    this.samples.push({ x: e.clientX, y: e.clientY, t: now });
    if (this.samples.length > 6) this.samples.shift();

    if (this.phase === 'pending') {
      if (Math.hypot(dx, dy) < this.config.lockDistance) return;
      this.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      const hasDirection =
        this.axis === 'x'
          ? this.allowed.has('left') || this.allowed.has('right')
          : this.allowed.has('up') || this.allowed.has('down');
      if (!hasDirection) {
        this.phase = 'ignored';
        return;
      }
      this.phase = 'dragging';
      try {
        this.el.setPointerCapture(e.pointerId);
      } catch {
        /* capture can fail for synthetic events; the gesture still works */
      }
      this.handlers.onLock?.(this.axis);
    }

    this.handlers.onMove?.(this.moveInfo(dx, dy));
  };

  private onUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    const wasDragging = this.phase === 'dragging';
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    const now = performance.now();
    this.reset();
    if (!wasDragging) return;

    const d = this.axis === 'x' ? dx : dy;
    const direction = this.toDirection(this.axis, d);
    const size = this.axis === 'x' ? this.el.clientWidth : this.el.clientHeight;
    const fraction = this.axis === 'x' ? this.config.commitFractionX : this.config.commitFractionY;
    const velocity = this.releaseVelocity(this.axis);
    const byDistance = Math.abs(d) >= size * fraction;
    const byFlick =
      Math.abs(d) >= this.config.flickMinDistance &&
      velocity >= this.config.flickVelocity &&
      Math.sign(this.signedVelocity(this.axis)) === Math.sign(d);

    if (this.allowed.has(direction) && (byDistance || byFlick)) {
      this.handlers.onCommit?.({
        direction,
        decidedAt: now,
        gestureMs: now - this.startT,
        velocity,
        viaFlick: !byDistance && byFlick,
      });
    } else {
      this.handlers.onCancel?.();
    }
  };

  private onCancel = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    const wasDragging = this.phase === 'dragging';
    this.reset();
    if (wasDragging) this.handlers.onCancel?.();
  };

  private reset(): void {
    try {
      if (this.pointerId !== -1) this.el.releasePointerCapture(this.pointerId);
    } catch {
      /* already released */
    }
    this.phase = 'idle';
    this.pointerId = -1;
    this.samples = [];
  }

  private toDirection(axis: Axis, d: number): Direction {
    if (axis === 'x') return d < 0 ? 'left' : 'right';
    return d < 0 ? 'up' : 'down';
  }

  private moveInfo(dx: number, dy: number): MoveInfo {
    const raw = this.axis === 'x' ? dx : dy;
    const direction = this.toDirection(this.axis, raw);
    const allowed = this.allowed.has(direction);
    const shown = allowed ? raw : raw * this.config.resistance;
    const size = this.axis === 'x' ? this.el.clientWidth : this.el.clientHeight;
    const fraction = this.axis === 'x' ? this.config.commitFractionX : this.config.commitFractionY;
    const threshold = Math.max(1, size * fraction);
    return {
      axis: this.axis,
      dx: this.axis === 'x' ? shown : 0,
      dy: this.axis === 'y' ? shown : 0,
      progress: allowed ? Math.min(1, Math.abs(raw) / threshold) : 0,
      direction,
      allowed,
    };
  }

  private signedVelocity(axis: Axis): number {
    const n = this.samples.length;
    if (n < 2) return 0;
    const last = this.samples[n - 1];
    // Use the oldest sample within 100 ms of the last one.
    let first = this.samples[0];
    for (const s of this.samples) {
      if (last.t - s.t <= 100) {
        first = s;
        break;
      }
    }
    const dt = last.t - first.t;
    if (dt <= 0) return 0;
    const dist = axis === 'x' ? last.x - first.x : last.y - first.y;
    return dist / dt;
  }

  private releaseVelocity(axis: Axis): number {
    return Math.abs(this.signedVelocity(axis));
  }
}
