import React, { useEffect, useRef } from 'react';

/**
 * Full-viewport holographic backdrop (fixed, z-0, behind all content):
 *
 *   · drifting starfield in THREE depth bands — each band parallaxes at a
 *     different speed around a focus point that follows the cursor, so the
 *     scene physically "leans" as you move the mouse (the 5D depth cue);
 *   · two soft nebula glows (cyan / violet) that counter-drift with the mouse;
 *   · a perspective grid floor scrolling toward the viewer, vanishing point
 *     sliding with the cursor.
 *
 * Everything runs in a single requestAnimationFrame loop, is capped at 1.75×
 * DPR, pauses in hidden tabs (rAF does it for us), and renders one static
 * frame when the user prefers reduced motion or on coarse (touch) pointers.
 */

interface Star {
  x: number;
  y: number;
  d: number; // depth 0..1 (1 = close)
  tw: number; // twinkle phase
}

interface Nebula {
  x: number; // 0..1 of width
  y: number; // 0..1 of height
  r: number; // 0..1 of min(w,h)
  hue: string;
  depth: number; // parallax multiplier
}

const NEBULAS: Nebula[] = [
  { x: 0.18, y: 0.24, r: 0.55, hue: 'rgba(34, 211, 238, 0.055)', depth: 0.35 },
  { x: 0.84, y: 0.72, r: 0.62, hue: 'rgba(168, 85, 247, 0.06)', depth: 0.55 },
  { x: 0.62, y: 0.12, r: 0.4, hue: 'rgba(56, 189, 248, 0.045)', depth: 0.25 },
];

const HoloBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 1.75);

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let raf = 0;
    let last = performance.now();
    let gridPhase = 0;

    // Target pointer (normalized -1..1) and its smoothed follower.
    let tx = 0;
    let ty = 0;
    let px = 0;
    let py = 0;

    const seedStars = () => {
      const count = Math.min(150, Math.max(70, Math.round((width * height) / 11000)));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        d: Math.random(),
        tw: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * DPR);
      canvas.height = Math.round(height * DPR);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      seedStars();
      if (reduced || !finePointer) draw(0, performance.now());
    };

    const draw = (dt: number, t: number) => {
      ctx.clearRect(0, 0, width, height);

      // ── Nebulas ───────────────────────────────────────────────────────────
      for (const n of NEBULAS) {
        const cx = n.x * width - px * 40 * n.depth;
        const cy = n.y * height - py * 26 * n.depth + Math.sin(t * 0.00021 + n.x * 9) * 14;
        const r = n.r * Math.min(width, height);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, n.hue);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

      // ── Starfield (focus point leans toward the cursor) ───────────────────
      const focusX = width / 2 + px * 46;
      const focusY = height / 2 + py * 30;
      ctx.save();
      for (const s of stars) {
        // Slow warp outward from the focus point — closer stars move faster.
        const vx = s.x - focusX;
        const vy = s.y - focusY;
        s.x += vx * dt * 0.00016 * (0.25 + s.d);
        s.y += vy * dt * 0.00016 * (0.25 + s.d) + dt * 0.004 * (0.2 + s.d);
        if (s.x < -4) s.x = width + 4;
        if (s.x > width + 4) s.x = -4;
        if (s.y < -4) s.y = height + 4;
        if (s.y > height + 4) s.y = -4;

        const twinkle = 0.65 + 0.35 * Math.sin(t * 0.0016 + s.tw);
        const r = 0.4 + s.d * 1.5;
        const alpha = (0.14 + s.d * 0.6) * twinkle;
        // Parallax: nearer stars shift more with the cursor.
        const ox = s.x - px * 22 * s.d;
        const oy = s.y - py * 14 * s.d;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = s.d > 0.82 ? '#a5f3fc' : s.d > 0.55 ? '#7dd3fc' : '#94a3b8';
        ctx.beginPath();
        ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      // ── Perspective grid floor ────────────────────────────────────────────
      const horizon = height * 0.66;
      const vpx = width / 2 + px * 60; // vanishing point slides with the mouse
      const gridAlpha = 0.16;

      ctx.save();
      ctx.lineWidth = 1;

      // Vertical lines fanning out from the vanishing point.
      const cols = 22;
      for (let i = 0; i <= cols; i++) {
        const fx = (i / cols) * (width * 1.6) - width * 0.3;
        ctx.strokeStyle = `rgba(56, 189, 248, ${gridAlpha * 0.5})`;
        ctx.beginPath();
        ctx.moveTo(vpx, horizon);
        ctx.lineTo(fx, height + 60);
        ctx.stroke();
      }

      // Horizontal lines rushing toward the viewer (accelerating spacing).
      gridPhase = (gridPhase + dt * 0.00012) % 1;
      const rows = 14;
      for (let i = 0; i < rows; i++) {
        const f = (i + gridPhase) / rows;
        const y = horizon + Math.pow(f, 2.6) * (height - horizon + 40);
        if (y > height + 40) continue;
        const a = gridAlpha * (0.25 + f * 1.4);
        ctx.strokeStyle = `rgba(103, 232, 249, ${Math.min(a, 0.4)})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Horizon glow line.
      const hg = ctx.createLinearGradient(0, horizon - 24, 0, horizon + 26);
      hg.addColorStop(0, 'rgba(34, 211, 238, 0)');
      hg.addColorStop(0.5, 'rgba(34, 211, 238, 0.10)');
      hg.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = hg;
      ctx.fillRect(0, horizon - 24, width, 50);
      ctx.restore();
    };

    const loop = (t: number) => {
      const dt = Math.min(t - last, 50);
      last = t;
      px += (tx - px) * 0.045;
      py += (ty - py) * 0.045;
      draw(dt, t);
      // Expose the smoothed pointer for DOM-level parallax layers (orbs).
      document.documentElement.style.setProperty('--par-x', `${px * 26}px`);
      document.documentElement.style.setProperty('--par-y', `${py * 20}px`);
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / width) * 2 - 1;
      ty = (e.clientY / height) * 2 - 1;
    };

    window.addEventListener('resize', resize);
    if (finePointer) window.addEventListener('pointermove', onMove, { passive: true });
    resize();
    if (!reduced && finePointer) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.style.removeProperty('--par-x');
      document.documentElement.style.removeProperty('--par-y');
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 z-0"
      style={{ pointerEvents: 'none' }}
    />
  );
};

export default HoloBackground;
