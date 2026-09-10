import React, { useEffect, useState } from 'react';
import { GeneratedImage, ImageFormat } from '../types';

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
      <div className="glass-panel rounded-[28px] w-full min-h-[320px] md:min-h-[520px] max-h-[72vh] relative overflow-hidden flex items-center justify-center stage-bg">
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
            <p className="text-lg font-black text-white tracking-tight italic">This image could not be displayed</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              The source is unreachable from this browser — usually because the free engine is offline,
              your network blocks <span className="text-slate-200 font-semibold">image.pollinations.ai</span>, or the
              temporary local copy expired. Your prompt and settings are still here, so you can just retry.
            </p>
            <button
              onClick={() => { setRetryNonce((n) => n + 1); setFailed(false); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-colors"
            >
              Try loading it again
            </button>
          </div>
        ) : (
          !busy && (
            <div className="text-center space-y-4 p-10 opacity-30">
              <svg className="h-24 w-24 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-2xl font-black tracking-tighter uppercase italic text-slate-300">Ready for creation</p>
              <p className="text-xs text-slate-500 not-italic font-medium tracking-normal max-w-xs mx-auto">
                100% free generation — no account, no subscription. Just describe an idea and hit Generate.
              </p>
            </div>
          )
        )}

        {busy && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl flex flex-col items-center justify-center space-y-6 z-20 animate-fade-in">
            <div className="relative">
              <div className="w-24 h-24 border-[6px] border-indigo-500/10 rounded-full" />
              <div className="absolute inset-0 w-24 h-24 border-t-[6px] border-indigo-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">✨</div>
            </div>
            <div className="text-center space-y-2 px-6">
              <h3 className="text-xl font-black text-white tracking-widest uppercase italic">
                {isUpscaling ? 'Enhancing Details' : 'Painting Dreamscape'}
              </h3>
              <p className="text-indigo-300 text-sm font-medium animate-pulse min-h-[1.25rem]">
                {statusMessage || LOADING_LINES[lineIdx]}
              </p>
            </div>
            <div className="w-56 h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-full shimmer-bar" />
            </div>
          </div>
        )}

        {/* Image meta badge */}
        {image && !busy && (
          <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2 max-w-[calc(100%-1.5rem)]">
            <span className="text-[10px] font-bold bg-black/60 backdrop-blur px-2.5 py-1 rounded-full text-slate-300 border border-white/10">
              {image.engine === 'gemini' ? '🍌 Gemini' : `🌸 ${image.model === 'turbo' ? 'Turbo' : 'FLUX'}`}
            </span>
            {image.seed !== undefined && (
              <span className="text-[10px] font-bold bg-black/60 backdrop-blur px-2.5 py-1 rounded-full text-slate-300 border border-white/10">
                seed {image.seed}
              </span>
            )}
            <span className="text-[10px] font-bold bg-black/60 backdrop-blur px-2.5 py-1 rounded-full text-slate-300 border border-white/10">
              {image.aspectRatio}
            </span>
          </div>
        )}
      </div>

      {/* Action bar */}
      {image && (
        <div className="glass-panel rounded-2xl p-3 flex flex-wrap items-center gap-2 animate-slide-up">
          <div className="flex items-center gap-1.5 bg-slate-900/70 rounded-xl px-2 py-1.5 border border-white/5">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1">Export</span>
            {(['png', 'jpeg', 'webp'] as ImageFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => onExport(f)}
                className="text-[10px] font-black uppercase tracking-wider bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors"
              >
                {f === 'jpeg' ? 'jpg' : f}
              </button>
            ))}
          </div>

          <button
            onClick={onUpscale}
            disabled={busy}
            className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl transition-colors border border-white/5"
            title="2× resolution + detail sharpening (free, runs locally) — AI enhance if a Gemini key is set"
          >
            🔍 Upscale ×2
          </button>

          <button
            onClick={onVariation}
            disabled={busy}
            className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl transition-colors border border-white/5"
            title="New variation of the same prompt"
          >
            🎲 Variation
          </button>

          <button
            onClick={onSave}
            disabled={isSaved}
            className={`ml-auto flex items-center gap-2 text-[11px] font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all border ${
              isSaved
                ? 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30 cursor-default'
                : 'bg-indigo-600/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600/30'
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
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 max-w-3xl glass-panel rounded-2xl px-5 py-3 mx-4">
            <p className="text-xs text-slate-300 text-center line-clamp-2">{image.prompt}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StageView;
