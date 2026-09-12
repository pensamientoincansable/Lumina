import React from 'react';
import { AspectRatio, Engine, PollinationsModel, RATIO_PRESETS, STYLE_PRESETS } from '../types';

interface GeneratePanelProps {
  prompt: string;
  setPrompt: (v: string) => void;
  engine: Engine;
  setEngine: (e: Engine) => void;
  pollinationsModel: PollinationsModel;
  setPollinationsModel: (m: PollinationsModel) => void;
  styleId: string;
  setStyleId: (id: string) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (r: AspectRatio) => void;
  seed: string; // '' = random
  setSeed: (v: string) => void;
  isGenerating: boolean;
  isEnhancing: boolean;
  geminiReady: boolean;
  onGenerate: () => void;
  onEnhance: () => void;
  onOpenSettings: () => void;
}

const ENGINE_OPTIONS: { id: Engine; label: string; hint: string }[] = [
  { id: 'auto', label: 'Auto', hint: 'Best available' },
  { id: 'pollinations', label: 'Free', hint: 'No key needed' },
  { id: 'gemini', label: 'Gemini', hint: 'Free API key' },
];

const LABEL_CLS = 'font-hud text-[11px] font-bold text-cyan-400/80 uppercase tracking-[0.22em]';

const GeneratePanel: React.FC<GeneratePanelProps> = (props) => {
  const {
    prompt, setPrompt, engine, setEngine, pollinationsModel, setPollinationsModel,
    styleId, setStyleId, aspectRatio, setAspectRatio, seed, setSeed,
    isGenerating, isEnhancing, geminiReady, onGenerate, onEnhance, onOpenSettings,
  } = props;

  const showEngineWarning = engine === 'gemini' && !geminiReady;

  return (
    <div className="holo-panel hud-corners p-6 md:p-7 rounded-3xl space-y-6">
      {/* Engine selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className={LABEL_CLS}>Engine</label>
          <button onClick={onOpenSettings} className="font-hud text-[10px] font-bold text-cyan-400 hover:text-cyan-200 flex items-center gap-1 tracking-[0.14em] transition-colors">
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            API KEYS
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ENGINE_OPTIONS.map((opt) => {
            const active = engine === opt.id;
            const dimmed = opt.id === 'gemini' && !geminiReady;
            return (
              <button
                key={opt.id}
                onClick={() => setEngine(opt.id)}
                title={dimmed ? 'Add a free Gemini API key in Settings to use this engine' : opt.hint}
                className={`holo-chip ${active ? 'is-active' : ''} px-2 py-2.5 rounded-xl text-center`}
              >
                <span className={`block font-hud text-[11px] font-bold uppercase tracking-[0.14em] ${active ? 'text-cyan-100' : 'text-slate-400'}`}>{opt.label}</span>
                <span className={`block font-hud text-[9px] mt-0.5 tracking-wide ${dimmed ? 'text-amber-400/90' : 'text-slate-500'}`}>
                  {dimmed ? 'key missing' : opt.hint}
                </span>
              </button>
            );
          })}
        </div>
        {showEngineWarning && (
          <p className="font-hud text-[10.5px] text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2 leading-relaxed tracking-wide">
            GEMINI REQUIRES A FREE API KEY —{' '}
            <button onClick={onOpenSettings} className="underline underline-offset-2 font-bold">OPEN SETTINGS</button>{' '}
            OR SWITCH TO THE FREE ENGINE.
          </p>
        )}
        {(engine === 'pollinations' || (engine === 'auto' && !geminiReady)) && (
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'flux' as PollinationsModel, label: 'FLUX', hint: 'Best quality · sharp' },
              { id: 'turbo' as PollinationsModel, label: 'Turbo', hint: 'Fastest · softer' },
            ]).map((m) => (
              <button
                key={m.id}
                onClick={() => setPollinationsModel(m.id)}
                className={`holo-chip ${pollinationsModel === m.id ? 'is-active' : ''} px-3 py-2 rounded-xl text-left`}
              >
                <span className={`block font-hud text-[11px] font-bold tracking-[0.12em] ${pollinationsModel === m.id ? 'text-cyan-100' : 'text-slate-400'}`}>{m.label}</span>
                <span className="block font-hud text-[9px] text-slate-500 tracking-wide">{m.hint}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className={LABEL_CLS}>Prompt</label>
          <button
            onClick={onEnhance}
            disabled={isEnhancing || !prompt.trim() || isGenerating}
            className="font-hud text-[10px] font-bold text-emerald-300 hover:text-emerald-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors tracking-[0.16em]"
            title="Rewrite your idea as a detailed professional prompt (free)"
          >
            <svg className={`h-3.5 w-3.5 ${isEnhancing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {isEnhancing ? 'ENHANCING…' : 'ENHANCE ⚡'}
          </button>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onGenerate();
          }}
          placeholder="A lighthouse on a cliff at sunset, giant waves crashing…"
          rows={4}
          className="w-full bg-[#040a16]/90 border border-cyan-500/15 rounded-2xl p-4 text-white text-sm placeholder-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/25 outline-none resize-none transition-all"
        />
        <div className="flex justify-between font-hud text-[9.5px] text-slate-600 tracking-[0.12em]">
          <span>CTRL/⌘ + ENTER TO GENERATE</span>
          <span>{prompt.length} CHARS</span>
        </div>
      </div>

      {/* Styles */}
      <div className="space-y-3">
        <label className={`${LABEL_CLS} block`}>Art Style</label>
        <div className="grid grid-cols-3 gap-1.5 max-h-44 overflow-y-auto pr-1">
          {STYLE_PRESETS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyleId(s.id)}
              className={`holo-chip is-magenta ${styleId === s.id ? 'is-active' : ''} px-1.5 py-2 rounded-lg text-[10px] font-bold truncate`}
              title={s.label}
            >
              <span className="mr-1">{s.emoji}</span>
              <span className={styleId === s.id ? 'text-fuchsia-100' : 'text-slate-400'}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Aspect ratio */}
      <div className="space-y-3">
        <label className={`${LABEL_CLS} block`}>Format</label>
        <div className="grid grid-cols-5 gap-1.5">
          {RATIO_PRESETS.map((r) => {
            const active = aspectRatio === r.id;
            // miniature rectangle that mirrors the ratio
            const maxW = 22;
            const maxH = 18;
            const scale = Math.min(maxW / r.width, maxH / r.height);
            return (
              <button
                key={r.id}
                onClick={() => setAspectRatio(r.id)}
                className={`holo-chip ${active ? 'is-active' : ''} flex flex-col items-center gap-1.5 py-2.5 rounded-xl`}
                title={`${r.label} · ${r.width}×${r.height}`}
              >
                <span
                  className={`rounded-[3px] border-2 ${active ? 'border-cyan-200/90 bg-cyan-300/25' : 'border-current opacity-60'}`}
                  style={{ width: Math.max(8, r.width * scale), height: Math.max(8, r.height * scale) }}
                />
                <span className={`font-hud text-[9px] font-bold tracking-wide ${active ? 'text-cyan-100' : 'text-slate-500'}`}>{r.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Seed */}
      <div className="space-y-2">
        <label className={`${LABEL_CLS} block`}>
          Seed <span className="text-slate-600 normal-case font-medium tracking-normal">(empty = random)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={seed}
            onChange={(e) => setSeed(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
            placeholder="RANDOM"
            className="flex-1 min-w-0 bg-[#040a16]/90 border border-cyan-500/15 rounded-xl px-4 py-2.5 text-sm font-hud text-white placeholder-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/25 outline-none"
          />
          <button
            onClick={() => setSeed(String(Math.floor(Math.random() * 1_000_000_000)))}
            title="Roll a random seed"
            className="px-3.5 holo-chip rounded-xl text-slate-300 hover:text-cyan-100 text-base"
          >
            🎲
          </button>
          {seed && (
            <button
              onClick={() => setSeed('')}
              title="Back to random seed"
              className="px-3.5 holo-chip rounded-xl text-slate-300 hover:text-cyan-100 text-sm"
            >
              ↺
            </button>
          )}
        </div>
      </div>

      {/* Generate */}
      <button
        onClick={onGenerate}
        disabled={isGenerating || !prompt.trim()}
        className={`w-full rounded-2xl font-display font-bold text-sm tracking-[0.24em] uppercase transition-all ${
          isGenerating || !prompt.trim()
            ? 'bg-[#0a1424] text-slate-500 cursor-not-allowed border border-white/5'
            : 'holo-btn text-white'
        }`}
        style={{ paddingTop: '1.15rem', paddingBottom: '1.15rem' }}
      >
        {isGenerating ? '◈ Synthesizing…' : '⚡ Generate Image'}
      </button>
    </div>
  );
};

export default GeneratePanel;
