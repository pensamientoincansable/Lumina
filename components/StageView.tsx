import React, { useEffect, useState } from 'react';
import { GeneratedImage, ImageFormat } from '../types';
import Tilt3D from './fx/Tilt3D';

interface StageViewProps {
  image: GeneratedImage | null;
  isGenerating: boolean;
  isUpscaling: boolean;
  statusMessage: string;
  onExport: (format: ImageFormat) => void;
  onUpscale: () => void;
  onVariation: () => void;
  onSave: () => void;
  isSaved: boolean;
}

const LOADING_LINES = [
  'Synthesizing textures and lighting…',
  'Dreaming up composition…',
  'Painting fine details…',
  'Balancing color and contrast…',
  'Almost there — polishing pixels…',
];

/** Short, HUD-friendly names for the engines/models that can appear in history. */
const engineLabel = (image: GeneratedImage): string => {
  if (image.engine === 'gemini') {
    if (image.model === 'gemini-3-pro-image') return '🍌 GEMINI 3 PRO';
    if (image.model === 'gemini-3.1-flash-image') return '🍌 GEMINI 3.1';
    if (image.model === 'gemini-2.5-flash-image') return '🍌 GEMINI 2.5';
    return '🍌 GEMINI';
  }
  return image.model === 'turbo' ? '⚡ TURBO' : '⚡ FLUX';
};

/** Cache-buster so a re-download is actually attempted (Pollinations caches by URL). */
const retryableSrc = (url: string, nonce: number) =>
  nonce && /^https?:/i.test(url) ? `${url}${url.includes('?') ? '&' : '?'}r=${nonce}` : url;

const StageView: React.FC<StageViewProps> = ({
  image, isGenerating, isUpscaling, statusMessage, onExport, onUpscale, onVariation, onSave, isSaved,
}) => {
  const [lineIdx, setLineIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  // A failed <img> used to leave the stage visually empty (the other "blank page"),
  // with the reason only in the network tab. Track it and offer a retry instead.
  const [failed, setFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const busy = isGenerating || isUpscaling;

  useEffect(() => {
    setFailed(false);
  }, [image?.url]);

  useEffect(() => {
    if (!busy) return;
    setLineIdx(0);
    const t = setInterval(() => setLineIdx((i) => (i + 1) % LOADING_LINES.length), 3500);
    return () => clearInterval(t);
  }, [busy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLightbox(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="space-y-5">
      {/* The frame tilts (Tilt3D); the lightbox lives OUTSIDE it on purpose —
          a transformed ancestor would break the lightbox's position:fixed. */}
      <Tilt3D max={2.4} scale={1.002} glare>
      <div className="holo-panel hud-corners scanlines rounded-[28px] w-full min-h-[320px] md:min-h-[520px] max-h-[72vh] relative overflow-hidden flex items-center justify-center stage-bg">
        {/* Hologram refresh sweep */}
        <div className="holo-scan-line" aria-hidden />

        {image && !failed ? (
          <img
            src={retryableSrc(image.url, retryNonce)}
            alt={image.originalPrompt}
            className="max-h-[72vh] w-full object-contain animate-zoom-in cursor-zoom-in select-none"
            onClick={() => !busy && setLightbox(true)}
            onError={() => setFailed(true)}
            draggable={false}
          />
        ) : image ? (
          <div className="text-center space-y-4 p-10 max-w-md">
            <div className="text-4xl">🖼️</div>
            <p className="font-display text-lg font-bold text-cyan-100 tracking-wider">Signal lost</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              The source is unreachable from this browser — usually because the free engine is offline,
              your network blocks <span className="text-cyan-300 font-semibold">image.pollinations.ai</span>, or the
              temporary local copy expired. Your prompt and settings are still here, so you can just retry.
            </p>
            <button
              onClick={() => { setRetryNonce((n) => n + 1); setFailed(false); }}
              className="holo-chip is-active text-cyan-100 text-[11px] font-black uppercase tracking-[0.18em] px-5 py-2.5 rounded-xl"
            >
              Re-acquire signal
            </button>
          </div>
        ) : (
          !busy && (
            <div className="text-center space-y-4 p-10">
              <div className="relative inline-block">
                <svg className="h-24 w-24 mx-auto text-cyan-300/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="absolute inset-0 rounded-full bg-cyan-400/10 blur-2xl" aria-hidden />
              </div>
              <p className="font-display text-2xl font-extrabold tracking-[0.12em] uppercase text-cyan-100/80 holo-text">Ready for creation</p>
              <p className="font-hud text-[11px] text-slate-500 tracking-[0.1em] max-w-xs mx-auto">
                100% FREE SYNTHESIS — NO ACCOUNT, NO SUBSCRIPTION. DESCRIBE AN IDEA AND HIT GENERATE.
              </p>
            </div>
          )
        )}

        {busy && (
          <div className="absolute inset-0 bg-[#02060d]/88 backdrop-blur-xl flex flex-col items-center justify-center space-y-7 z-20 animate-fade-in scanlines">
            {/* Dual-ring holo loader */}
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/25 animate-spin-rev-slow" />
              <div className="absolute inset-[7px] rounded-full border-[5px] border-cyan-500/10" />
              <div className="absolute inset-[7px] rounded-full border-[5px] border-transparent border-t-cyan-300 border-r-cyan-500/60 animate-spin shadow-[0_0_24px_-4px_rgba(34,211,238,0.6)]" />
              <div className="absolute inset-0 flex items-center justify-center text-xl">✦</div>
            </div>
            <div className="text-center space-y-2 px-6">
              <h3 className="font-display text-lg font-bold text-cyan-100 tracking-[0.3em] uppercase">
                {isUpscaling ? 'Detail Enhancement' : 'Painting Dreamscape'}
              </h3>
              <p className="font-hud text-cyan-300/90 text-xs tracking-[0.12em] animate-pulse min-h-[1.25rem]">
                {statusMessage || LOADING_LINES[lineIdx]}
              </p>
            </div>
            <div className="w-56 h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-full shimmer-bar" />
            </div>
          </div>
        )}

        {/* Image meta badges */}
        {image && !busy && (
          <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2 max-w-[calc(100%-1.5rem)]">
            <span className="font-hud text-[9.5px] font-bold bg-[#02060d]/80 backdrop-blur px-2.5 py-1 rounded-full text-cyan-200 border border-cyan-400/25 tracking-[0.1em]">
              {engineLabel(image)}
            </span>
            {image.seed !== undefined && (
              <span className="font-hud text-[9.5px] font-bold bg-[#02060d]/80 backdrop-blur px-2.5 py-1 rounded-full text-slate-300 border border-white/10 tracking-[0.1em]">
                SEED {image.seed}
              </span>
            )}
            <span className="font-hud text-[9.5px] font-bold bg-[#02060d]/80 backdrop-blur px-2.5 py-1 rounded-full text-slate-300 border border-white/10 tracking-[0.1em]">
              {image.aspectRatio}
            </span>
          </div>
        )}
      </div>
      </Tilt3D>

      {/* Action bar */}
      {image && (
        <div className="holo-panel rounded-2xl p-3 flex flex-wrap items-center gap-2 animate-slide-up">
          <div className="flex items-center gap-1.5 bg-[#050b18]/80 rounded-xl px-2 py-1.5 border border-cyan-500/15">
            <span className="font-hud text-[9.5px] font-bold text-cyan-400/70 uppercase tracking-[0.18em] px-1">Export</span>
            {(['png', 'jpeg', 'webp'] as ImageFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => onExport(f)}
                className="font-hud text-[10px] font-bold uppercase tracking-wider bg-[#0a1424] hover:bg-cyan-500/25 text-slate-300 hover:text-cyan-100 hover:shadow-[0_0_14px_-4px_rgba(34,211,238,0.6)] px-2.5 py-1.5 rounded-lg transition-all"
              >
                {f === 'jpeg' ? 'jpg' : f}
              </button>
            ))}
          </div>

          <button
            onClick={onUpscale}
            disabled={busy}
            className="holo-chip font-hud text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-200 px-4 py-2.5 rounded-xl disabled:opacity-40"
            title="2× resolution + detail sharpening (free, runs locally) — AI enhance if a Gemini key is set"
          >
            🔍 Upscale ×2
          </button>

          <button
            onClick={onVariation}
            disabled={busy}
            className="holo-chip font-hud text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-200 px-4 py-2.5 rounded-xl disabled:opacity-40"
            title="New variation of the same prompt"
          >
            🎲 Variation
          </button>

          <button
            onClick={onSave}
            disabled={isSaved}
            className={`ml-auto flex items-center gap-2 font-hud text-[10.5px] font-bold uppercase tracking-[0.14em] px-4 py-2.5 rounded-xl transition-all border ${
              isSaved
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30 cursor-default'
                : 'bg-fuchsia-500/10 text-fuchsia-200 border-fuchsia-400/30 hover:bg-fuchsia-500/25 hover:shadow-[0_0_18px_-6px_rgba(232,121,249,0.7)]'
            }`}
          >
            {isSaved ? '✓ In Gallery' : '＋ Save to Gallery'}
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && image && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in cursor-zoom-out"
          onClick={() => setLightbox(false)}
        >
          <img
            src={image.url}
            alt={image.originalPrompt}
            onError={() => setLightbox(false)}
            className="max-w-full max-h-full object-contain rounded-lg shadow-[0_0_80px_-16px_rgba(34,211,238,0.45)]"
          />
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 max-w-3xl holo-panel rounded-2xl px-5 py-3 mx-4">
            <p className="text-xs text-slate-300 text-center line-clamp-2">{image.prompt}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StageView;
