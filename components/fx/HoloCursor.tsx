import React, { useEffect, useRef, useState } from 'react';

/**
 * Holographic cursor FX (fine pointers only, off with reduced motion):
 *
 *   · bright core dot tracking the pointer 1:1;
 *   · a lagging ring that eases behind it — and blooms magenta over any
 *     interactive element (buttons, links, inputs, [role=button]);
 *   · click ripples expanding from the press point;
 *   · a large soft "spotlight" (mix-blend: screen) that drifts with the
 *     pointer, lighting up whatever layer it passes over — combined with the
 *     starfield parallax this is what sells the layered 5D depth.
 *
 * The native cursor stays visible (usability); these layers just augment it.
 * All elements are pointer-events: none and rendered in a single fixed node
 * tree, so there is zero layout cost.
 */

const INTERACTIVE = 'a, button, input, textarea, select, label, [role="button"], [tabindex]';

const HoloCursor: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return; // touch: skip
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const spot = spotRef.current;
    if (!dot || !ring || !spot) return;

    let raf = 0;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let sx = mx;
    let sy = my;
    let visible = false;

    const render = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      sx += (mx - sx) * 0.06;
      sy += (my - sy) * 0.06;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      spot.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
      raf = requestAnimationFrame(render);
    };

    const setHover = (on: boolean) => ring.classList.toggle('is-hover', on);

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!visible) {
        visible = true;
        rx = mx;
        ry = my;
        dot.classList.add('is-on');
        ring.classList.add('is-on');
      }
      const target = e.target as HTMLElement | null;
      setHover(!!target?.closest?.(INTERACTIVE));
    };
    const onDown = (e: PointerEvent) => {
      ring.classList.add('is-down');
      const layer = layerRef.current;
      if (layer) {
        const r = document.createElement('div');
        r.className = 'holo-ripple';
        r.style.left = `${e.clientX}px`;
        r.style.top = `${e.clientY}px`;
        r.addEventListener('animationend', () => r.remove(), { once: true });
        layer.appendChild(r);
        if (layer.childElementCount > 12) layer.firstElementChild?.remove();
      }
    };
    const onUp = () => ring.classList.remove('is-down');
    const onLeave = (e: MouseEvent) => {
      if (!e.relatedTarget) {
        visible = false;
        dot.classList.remove('is-on');
        ring.classList.remove('is-on');
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.documentElement.addEventListener('mouseout', onLeave, { passive: true });
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('mouseout', onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div ref={spotRef} className="holo-spotlight" aria-hidden />
      <div ref={ringRef} className="holo-cursor-ring" aria-hidden />
      <div ref={dotRef} className="holo-cursor-dot" aria-hidden />
      <div ref={layerRef} style={{ pointerEvents: 'none', position: 'fixed', inset: 0, zIndex: 2147482999 }} aria-hidden />
    </>
  );
};

export default HoloCursor;
