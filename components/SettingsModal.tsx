import React, { useState } from 'react';
import { KEY_SOURCES, getGeminiKey, getPollinationsKey, setGeminiKey, setPollinationsKey } from '../services/keyStore';

interface SettingsModalProps {
  onClose: () => void;
  onSaved?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onSaved }) => {
  const [geminiKey, setGeminiKeyInput] = useState(getGeminiKey());
  const [polliKey, setPolliKeyInput] = useState(getPollinationsKey());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setGeminiKey(geminiKey);
    setPollinationsKey(polliKey);
    setSaved(true);
    onSaved?.();
    setTimeout(onClose, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div
        className="glass-panel w-full max-w-lg p-8 rounded-3xl shadow-2xl relative animate-zoom-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors text-lg leading-none">✕</button>

        <h2 className="text-2xl font-black tracking-tight text-white mb-1">Engine Settings</h2>
        <p className="text-slate-400 text-sm mb-6">
          Lumina works out of the box with the free Pollinations engine — no key needed.
          Add keys below to unlock extra engines and higher limits. Keys are stored only in your browser.
        </p>

        {/* Gemini */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-black text-indigo-300 uppercase tracking-widest">Gemini API Key <span className="text-slate-500 normal-case font-medium">(optional)</span></label>
            <a
              href={KEY_SOURCES.gemini.url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
            >
              Get one free ↗
            </a>
          </div>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKeyInput(e.target.value)}
            placeholder="AIza…"
            autoComplete="off"
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
            {KEY_SOURCES.gemini.note} Unlocks the Gemini engine, AI prompt enhancement and AI upscale.
            Image quota on the free tier depends on Google's current per-project limits.
          </p>
        </div>

        {/* Pollinations */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-black text-teal-300 uppercase tracking-widest">Pollinations Key <span className="text-slate-500 normal-case font-medium">(optional)</span></label>
            <a
              href={KEY_SOURCES.pollinations.url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
            >
              Get one free ↗
            </a>
          </div>
          <input
            type="password"
            value={polliKey}
            onChange={(e) => setPolliKeyInput(e.target.value)}
            placeholder="pk_…"
            autoComplete="off"
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-teal-500 outline-none"
          />
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
            {KEY_SOURCES.pollinations.note}
          </p>
        </div>

        <button
          onClick={handleSave}
          className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl ${
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-900/40'
          }`}
        >
          {saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
