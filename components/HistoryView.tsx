import React, { useState } from 'react';
import { GeneratedImage } from '../types';
import Tilt3D from './fx/Tilt3D';

interface HistoryViewProps {
  images: GeneratedImage[];
  onSelect: (image: GeneratedImage) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

/**
 * One gallery tile.
 *
 * Older builds saved a session-scoped `blob:` URL in the history, which can never
 * load in a later session and showed up as a broken-image icon. Each tile therefore
 * falls back through its candidates (display URL → durable sourceUrl) and ends in a
 * legible "unavailable" card instead of a broken glyph. The card also 3D-tilts
 * under the cursor for the hologram-in-a-case feel.
 */
const GalleryTile: React.FC<{
  image: GeneratedImage;
  onSelect: (image: GeneratedImage) => void;
  onDelete: (id: string) => void;
}> = ({ image, onSelect, onDelete }) => {
  const candidates = [image.url, image.sourceUrl].filter(
    (u, i, arr): u is string => !!u && arr.indexOf(u) === i && !u.startsWith('blob:'),
  );
  const [step, setStep] = useState(0);
  const src = candidates[Math.min(step, candidates.length - 1)];
  const broken = !src || step >= candidates.length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !broken && onSelect(image)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!broken) onSelect(image);
        }
      }}
      className="group relative aspect-square cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-2xl"
    >
      <Tilt3D max={6.5} scale={1.03} className="w-full h-full">
        <div className="holo-panel hud-corners rounded-2xl w-full h-full overflow-hidden relative">
          {broken ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center px-4 py-3 gap-2 bg-[#050b18]/80">
              <span className="text-2xl opacity-50">🔌</span>
              <span className="font-hud text-[9.5px] font-bold uppercase tracking-[0.2em] text-slate-500">Signal unavailable</span>
            </div>
          ) : (
            <img
              src={src}
              alt={image.prompt}
              loading="lazy"
              onError={() => setStep((s) => s + 1)}
              className="w-full h-full object-cover"
            />
          )}
          {/* Overlay is click-through so the whole card opens the image */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#02060d]/95 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex flex-col justify-end p-3.5">
            <p className="text-[11px] text-cyan-50 line-clamp-2 leading-snug">{image.originalPrompt}</p>
            <div className="flex justify-between items-center mt-2">
              <span className="font-hud text-[9px] font-bold text-cyan-300/80 uppercase tracking-[0.14em]">
                {image.engine === 'gemini' ? 'Gemini' : image.model === 'turbo' ? 'Turbo' : 'FLUX'} · {new Date(image.timestamp).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(image.id);
            }}
            title="Delete"
            aria-label="Delete this creation"
            className="absolute top-2.5 right-2.5 p-2 bg-[#02060d]/80 backdrop-blur hover:bg-red-500/80 text-slate-300 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a1 1 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </Tilt3D>
    </div>
  );
};

const HistoryView: React.FC<HistoryViewProps> = ({ images, onSelect, onDelete, onClearAll }) => {
  if (images.length === 0) {
    return (
      <div className="holo-panel hud-corners flex flex-col items-center justify-center py-24 text-slate-500 rounded-3xl">
        <svg className="h-16 w-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="font-display text-xl font-bold text-cyan-100/70 tracking-[0.1em]">ARCHIVE EMPTY</p>
        <p className="font-hud text-xs mt-2 text-slate-500 tracking-[0.08em]">Everything you generate can be saved here — free, unlimited, private.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            if (window.confirm('Delete your entire gallery? This cannot be undone.')) onClearAll();
          }}
          className="font-hud text-[10.5px] font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-[0.22em]"
        >
          Purge archive
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {images.map((img) => (
          <GalleryTile key={img.id} image={img} onSelect={onSelect} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
};

export default HistoryView;
