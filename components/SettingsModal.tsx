import React, { useState } from 'react';
import { KEY_SOURCES, getGeminiKey, getPollinationsKey, setGeminiKey, setPollinationsKey } from '../services/keyStore';
import { verifyGeminiKey, type KeyCheckResult } from '../services/geminiService';
import Tilt3D from './fx/Tilt3D';

interface SettingsModalProps {
  onClose: () => void;
  onSaved?: () => void;
}

type TestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'done'; result: KeyCheckResult };

const LABEL_CLS = 'font-hud text-[11px] font-bold uppercase tracking-[0.22em]';

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onSaved }) => {
  const [geminiKey, setGeminiKeyInput] = useState(getGeminiKey());
  const [polliKey, setPolliKeyInput] = useState(getPollinationsKey());
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<TestState>({ status: 'idle' });

  const handleSave = () => {
    setGeminiKey(geminiKey);
    setPollinationsKey(polliKey);
    setSaved(true);
    onSaved?.();
    setTimeout(onClose, 700);
  };

  /** One-click proof that the key works — hits a cheap text model, no image quota. */
  const handleTest = async () => {
    const candidate = geminiKey.trim();
    if (!candidate || test.status === 'testing') return;
    // Persist first so verifyGeminiKey() reads exactly what is in the box.
    setGeminiKey(geminiKey);
    setTest({ status: 'testing' });
    const result = await verifyGeminiKey();
    setTest({ status: 'done', result });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <Tilt3D max={1.6} scale={1} className="w-full max-w-lg">
      <div
        className="holo-panel hud-corners w-full max-w-lg p-8 rounded-3xl shadow-2xl relative animate-zoom-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-cyan-200 transition-colors text-lg leading-none">✕</button>

        <h2 className="font-display text-2xl font-bold tracking-[0.08em] text-white mb-1 holo-text">Engine Settings</h2>
        <p className="font-hud text-slate-400 text-[11px] mb-6 leading-relaxed tracking-[0.06em]">
          LUMINA RUNS FREE ON THE POLLINATIONS ENGINE — NO KEY NEEDED.
          ADD KEYS BELOW TO UNLOCK EXTRA ENGINES AND HIGHER LIMITS. KEYS NEVER LEAVE YOUR BROWSER.
        </p>

        {/* Gemini */}
        <div className="rounded-2xl border border-cyan-500/15 bg-[#050b18]/70 p-5 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className={`${LABEL_CLS} text-cyan-300`}>Gemini API Key <span className="text-slate-500 normal-case tracking-normal">(optional)</span></label>
            <a
              href={KEY_SOURCES.gemini.url}
              target="_blank"
              rel="noreferrer"
              className="font-hud text-[10.5px] font-bold text-emerald-300 hover:text-emerald-200 underline underline-offset-2 tracking-[0.08em]"
            >
              GET ONE FREE ↗
            </a>
          </div>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => { setGeminiKeyInput(e.target.value); setTest({ status: 'idle' }); }}
            placeholder="AIza…"
            autoComplete="off"
            className="w-full bg-[#02060d] border border-cyan-500/15 rounded-xl px-4 py-2.5 text-sm font-hud text-white placeholder-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/25 outline-none"
          />
          <p className="font-hud text-[10px] text-slate-500 mt-1 leading-relaxed tracking-[0.04em]">
            {KEY_SOURCES.gemini.note} Unlocks the Gemini engine, AI prompt enhancement and AI upscale.
            Image models are auto-selected per plan: <span className="text-cyan-400/80">3 Pro (4K) → 3.1 Flash → 2.5 Flash</span>,
            and the first model that works on your key is remembered.
          </p>

          {/* Key self-test */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleTest}
              disabled={!geminiKey.trim() || test.status === 'testing'}
              className="holo-chip font-hud text-[10.5px] font-bold uppercase tracking-[0.18em] text-cyan-200 px-4 py-2 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {test.status === 'testing' ? '◈ Testing…' : '⚡ Test connection'}
            </button>
            {test.status === 'done' && (
              <span
                className={`font-hud text-[10px] leading-snug tracking-[0.04em] break-words ${test.result.ok ? 'text-emerald-300' : 'text-red-300'}`}
              >
                {test.result.ok ? `✓ ${test.result.message}` : `✗ ${test.result.message}`}
              </span>
            )}
          </div>
        </div>

        {/* Pollinations */}
        <div className="rounded-2xl border border-fuchsia-500/15 bg-[#050b18]/70 p-5 mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <label className={`${LABEL_CLS} text-fuchsia-300`}>Pollinations Key <span className="text-slate-500 normal-case tracking-normal">(optional)</span></label>
            <a
              href={KEY_SOURCES.pollinations.url}
              target="_blank"
              rel="noreferrer"
              className="font-hud text-[10.5px] font-bold text-emerald-300 hover:text-emerald-200 underline underline-offset-2 tracking-[0.08em]"
            >
              GET ONE FREE ↗
            </a>
          </div>
          <input
            type="password"
            value={polliKey}
            onChange={(e) => setPolliKeyInput(e.target.value)}
            placeholder="pk_…"
            autoComplete="off"
            className="w-full bg-[#02060d] border border-fuchsia-500/15 rounded-xl px-4 py-2.5 text-sm font-hud text-white placeholder-slate-600 focus:border-fuchsia-400/50 focus:ring-2 focus:ring-fuchsia-400/25 outline-none"
          />
          <p className="font-hud text-[10px] text-slate-500 leading-relaxed tracking-[0.04em]">
            {KEY_SOURCES.pollinations.note}
          </p>
        </div>

        <button
          onClick={handleSave}
          className={`w-full py-3.5 rounded-2xl font-display font-bold text-sm uppercase tracking-[0.24em] transition-all shadow-xl ${
            saved
              ? 'bg-emerald-600 text-white'
              : 'holo-btn text-white'
          }`}
        >
          {saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>
      </Tilt3D>
    </div>
  );
};

export default SettingsModal;
