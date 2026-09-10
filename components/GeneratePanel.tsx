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
  { id: 'gemini', label: 'Gemini', hint: 'Needs free API key' },
];

const GeneratePanel: React.FC<GeneratePanelProps> = (props) => {
  const {
    prompt, setPrompt, engine, setEngine, pollinationsModel, setPollinationsModel,
    styleId, setStyleId, aspectRatio, setAspectRatio, seed, setSeed,
    isGenerating, isEnhancing, geminiReady, onGenerate, onEnhance, onOpenSettings,
  } = props;

  const showEngineWarning = engine === 'gemini' && !geminiReady;

  return (
    <div className="glass-panel p-6 md:p-7 rounded-3xl space-y-6">
      {/* Engine selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Engine</label>
          <button onClick={onOpenSettings} className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            API Keys
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
                className={`px-2 py-2.5 rounded-xl border text-center transition-all ${
                  active
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/25'
                    : 'bg-slate-900/70 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/15'
                }`}
              >
                <span className="block text-xs font-black uppercase tracking-wider">{opt.label}</span>
                <span className={`block text-[9px] mt-0.5 ${dimmed ? 'text-amber-500/90' : 'text-slate-500'}`}>
                  {dimmed ? 'key missing' : opt.hint}
                </span>
              </button>
            );
          })}
        </div>
        {showEngineWarning && (
          <p className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 leading-relaxed">
            Gemini needs a free API key —{' '}
            <button onClick={onOpenSettings} className="underline underline-offset-2 font-bold">open Settings</button>{' '}
            or switch to the Free engine.
          </p>
        )}
        {(engine === 'pollinations' || (engine === 'auto' && !geminiReady)) && (
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'flux' as PollinationsModel, label: 'FLUX', hint: 'Best quality' },
              { id: 'turbo' as PollinationsModel, label: 'Turbo', hint: 'Fastest' },
            ]).map((m) => (
              <button
                key={m.id}
                onClick={() => setPollinationsModel(m.id)}
                className={`px-2 py-2 rounded-xl border text-left transition-all ${
                  pollinationsModel === m.id
                    ? 'bg-teal-600/20 border-teal-500/50 text-white'
                    : 'bg-slate-900/70 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="block text-xs font-bold">{m.label}</span>
                <span className="block text-[9px] text-slate-500">{m.hint}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Prompt</label>
          <button
            onClick={onEnhance}
            disabled={isEnhancing || !prompt.trim() || isGenerating}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
            title="Rewrite your idea as a detailed professional prompt (free)"
          >
            <svg className={`h-3.5 w-3.5 ${isEnhancing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {isEnhancing ? 'ENHANCING…' : '✨ ENHANCE'}
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
          className="w-full bg-slate-900/80 border border-white/5 rounded-2xl p-4 text-white text-sm placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
        />
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>Ctrl/⌘ + Enter to generate</span>
          <span>{prompt.length} chars</span>
        </div>
      </div>

      {/* Styles */}
      <div className="space-y-3">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Art Style</label>
        <div className="grid grid-cols-3 gap-1.5 max-h-44 overflow-y-auto pr-1">
          {STYLE_PRESETS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyleId(s.id)}
              className={`px-1.5 py-2 rounded-lg border text-[10px] font-bold transition-all truncate ${
                styleId === s.id
                  ? 'bg-purple-600/25 border-purple-500/60 text-white shadow-md shadow-purple-900/30'
                  : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/15'
              }`}
              title={s.label}
            >
              <span className="mr-1">{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aspect ratio */}
      <div className="space-y-3">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Format</label>
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
                className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all ${
                  active
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/25'
                    : 'bg-slate-900/70 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
                title={`${r.label} · ${r.width}×${r.height}`}
              >
                <span
                  className={`rounded-[3px] border-2 ${active ? 'border-white/90 bg-white/20' : 'border-current opacity-60'}`}
                  style={{ width: Math.max(8, r.width * scale), height: Math.max(8, r.height * scale) }}
                />
                <span className="text-[9px] font-bold">{r.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Seed */}
      <div className="space-y-2">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">
          Seed <span className="text-slate-600 normal-case font-medium">(empty = random)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={seed}
            onChange={(e) => setSeed(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
            placeholder="Random"
            className="flex-1 min-w-0 bg-slate-900/80 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            onClick={() => setSeed(String(Math.floor(Math.random() * 1_000_000_000)))}
            title="Roll a random seed"
            className="px-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-slate-300 hover:text-white hover:border-white/20 transition-all text-base"
          >
            🎲
          </button>
          {seed && (
            <button
              onClick={() => setSeed('')}
              title="Back to random seed"
              className="px-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-slate-300 hover:text-white hover:border-white/20 transition-all text-sm"
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
        className={`w-full rounded-2xl font-black text-sm tracking-widest uppercase transition-all ${
          isGenerating || !prompt.trim()
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 hover:scale-[1.015] text-white shadow-2xl shadow-indigo-900/50 animate-pulse-glow'
        }`}
        style={{ paddingTop: '1.1rem', paddingBottom: '1.1rem' }}
      >
        {isGenerating ? 'Generating…' : '⚡ Generate Image'}
      </button>
    </div>
  );
};

export default GeneratePanel;
