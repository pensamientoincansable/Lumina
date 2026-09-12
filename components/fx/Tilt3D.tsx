import React, { useCallback, useEffect, useRef } from 'react';

interface Tilt3DProps {
  children: React.ReactNode;
  className?: string;
  /** Maximum tilt in degrees (default 4). */
  max?: number;
  /** Hover scale (default 1.008; 1 = no scale). */
  scale?: number;
  /** Show the travelling light glare (default true). */
  glare?: boolean;
  as?: 'div' | 'section' | 'article' | 'li' | 'figure';
}

/**
 * Perspective tilt wrapper — the per-element half of the 5D depth system.
 *
 * While the pointer is over the element it eases a small rotateX/rotateY
 * (lerped with rAF, so it trails smoothly instead of snapping) plus a
 * `--mx/--my`-driven glare highlight, and returns to rest on leave.
 * Skipped entirely on touch pointers and reduced-motion users.
 */
const Tilt3D: React.FC<Tilt3DProps> = ({
  children,
  className = '',
  max = 4,
  scale = 1.008,
  glare = true,
  as = 'div',
}) => {
  const Tag = as as React.ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const state = useRef({ rx: 0, ry: 0, trx: 0, tRy: 0, hover: false, raf: 0 });

  const tick = useCallback(() => {
    const el = ref.current;
    const s = state.current;
    if (!el) return;
    s.rx += (s.trx - s.rx) * 0.14;
    s.ry += (s.tRy - s.ry) * 0.14;
    el.style.transform = `perspective(1000px) rotateX(${s.rx.toFixed(3)}deg) rotateY(${s.ry.toFixed(3)}deg) scale(${s.hover ? scale : 1})`;
    const resting = !s.hover && Math.abs(s.rx) < 0.02 && Math.abs(s.ry) < 0.02;
    if (!resting) {
      s.raf = requestAnimationFrame(tick);
    } else {
      // Reset the handle so the next pointer event can restart the loop —
      // a consumed rAF id is still a non-zero number, so leaving it set
      // would silently kill the tilt after the first hover cycle.
      s.raf = 0;
      el.style.transform = '';
      s.rx = s.ry = s.trx = s.tRy = 0;
    }
  }, [scale]);

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      const s = state.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      s.trx = -ny * max * 2;
      s.tRy = nx * max * 2;
      el.style.setProperty('--mx', `${((nx + 0.5) * 100).toFixed(2)}%`);
      el.style.setProperty('--my', `${((ny + 0.5) * 100).toFixed(2)}%`);
      if (!s.raf) s.raf = requestAnimationFrame(tick);
    },
    [max, tick],
  );

  const onEnter = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      const s = state.current;
      if (!el || e.pointerType === 'touch') return;
      s.hover = true;
      el.classList.add('is-active');
      if (!s.raf) s.raf = requestAnimationFrame(tick);
    },
    [tick],
  );

  const onLeave = useCallback(() => {
    const el = ref.current;
    const s = state.current;
    if (!el) return;
    s.hover = false;
    s.trx = 0;
    s.tRy = 0;
    el.classList.remove('is-active');
    if (!s.raf) s.raf = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(
    () => () => {
      if (state.current.raf) cancelAnimationFrame(state.current.raf);
    },
    [],
  );

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={`tilt3d ${className}`}
      onPointerMove={onMove}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onPointerCancel={onLeave}
    >
      {children}
      {glare && <span className="tilt3d-glare" aria-hidden />}
    </Tag>
  );
};

export default Tilt3D;
