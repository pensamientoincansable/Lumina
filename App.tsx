import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AspectRatio, Engine, GeneratedImage, ImageFormat, PollinationsModel,
  ToastMessage, User, getRatio,
} from './types';
import * as gemini from './services/geminiService';
import { composePrompt } from './services/promptComposer';
import { generateWithPollinations } from './services/pollinationsService';
import { enhancePrompt as enhancePromptCascade } from './services/enhanceService';
import { exportImage, localUpscale } from './services/imageTools';
import { hasGeminiKey } from './services/keyStore';
import { addToHistory, clearHistory, loadHistory, removeFromHistory } from './services/historyStore';
import { isObjectUrl, revokeObjectUrl, uid } from './utils';
import GeneratePanel from './components/GeneratePanel';
import StageView from './components/StageView';
import HistoryView from './components/HistoryView';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import Toasts from './components/Toasts';
import HoloBackground from './components/fx/HoloBackground';
import HoloCursor from './components/fx/HoloCursor';
import Tilt3D from './components/fx/Tilt3D';

const PROMPT_IDEAS = [
  'A lighthouse on a cliff at sunset, giant waves crashing',
  'A cozy ramen shop on a rainy night, steam and lanterns',
  'An astronaut discovering a glowing jungle on an alien planet',
  'A tiny dragon sleeping on a pile of gold coins',
];

let toastSeq = 1;

type View = 'generate' | 'gallery';

/**
 * Studio / Gallery switcher.
 *
 * It used to exist only inside the header's `hidden sm:flex` nav, which left phone
 * users with no way to reach their gallery at all — so it is rendered twice:
 * inline in the header on ≥640px and as a full-width bar below it on smaller screens.
 */
const ViewSwitcher: React.FC<{
  view: View;
  count: number;
  onChange: (v: View) => void;
  className?: string;
}> = ({ view, count, onChange, className = '' }) => (
  <div className={`items-center gap-1 bg-[#060d1c]/80 rounded-full p-1 border border-cyan-500/15 ${className}`}>
    {(['generate', 'gallery'] as const).map((v) => (
      <button
        key={v}
        onClick={() => onChange(v)}
        aria-current={view === v ? 'page' : undefined}
        className={`flex-1 text-center text-[11px] font-bold tracking-[0.18em] uppercase px-5 py-2 rounded-full transition-all font-hud ${
          view === v
            ? 'bg-cyan-500/15 text-cyan-200 shadow-[0_0_18px_-4px_rgba(34,211,238,0.7),inset_0_0_12px_-8px_rgba(103,232,249,0.8)] border border-cyan-400/40'
            : 'text-slate-500 hover:text-cyan-100 border border-transparent'
        }`}
      >
        {v === 'generate' ? '▸ Studio' : `Gallery${count ? ` (${count})` : ''}`}
      </button>
    ))}
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('lumina_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [showAuth, setShowAuth] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [view, setView] = useState<View>('generate');

  const [prompt, setPrompt] = useState('');
  const [styleId, setStyleId] = useState('none');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [engine, setEngine] = useState<Engine>('auto');
  const [pollinationsModel, setPollinationsModel] = useState<PollinationsModel>('flux');
  const [seed, setSeed] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [history, setHistory] = useState<GeneratedImage[]>(() => loadHistory());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [keysVersion, setKeysVersion] = useState(0);
  const toastTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // Re-render when API keys change elsewhere (settings modal saves and closes fast).
  useEffect(() => {
    const bump = () => setKeysVersion((v) => v + 1);
    window.addEventListener('lumina:keys-changed', bump);
    return () => window.removeEventListener('lumina:keys-changed', bump);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const timer = toastTimers.current.get(id);
    if (timer) clearTimeout(timer);
    toastTimers.current.delete(id);
  }, []);

  const pushToast = useCallback((kind: ToastMessage['kind'], text: string, sticky = false) => {
    const id = toastSeq++;
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    if (!sticky) {
      const timer = setTimeout(() => dismissToast(id), kind === 'error' ? 8000 : 4500);
      toastTimers.current.set(id, timer);
    }
  }, [dismissToast]);

  const saveImage = useCallback((img: GeneratedImage) => {
    setHistory((h) => addToHistory(h, img));
  }, []);

  // The stage shows a session-scoped blob: URL for instant display, while the gallery
  // stores durable URLs. Keep a ref so a replaced blob can be released (unreleased
  // blobs pile up in memory for the lifetime of the tab) and so history reads inside
  // callbacks never see a stale closure value.
  const historyRef = useRef<GeneratedImage[]>(history);
  const stageObjectUrl = useRef<string | null>(null);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const showImage = useCallback((img: GeneratedImage | null) => {
    const previous = stageObjectUrl.current;
    stageObjectUrl.current = img && isObjectUrl(img.url) ? img.url : null;
    setCurrentImage(img);
    if (previous && previous !== stageObjectUrl.current && !historyRef.current.some((e) => e.url === previous)) {
      revokeObjectUrl(previous);
    }
  }, []);

  const effectiveSeed = (variation: boolean): number => {
    const manual = parseInt(seed, 10);
    if (!Number.isNaN(manual)) return variation ? (manual + 1) % 1_000_000_000 : manual;
    return Math.floor(Math.random() * 1_000_000_000);
  };

  const handleGenerate = async (variation = false) => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isGenerating) return;

    // Composes: user text + style preset + sharpness intent + matching negative
    // prompt. This is the "no more blurry faces" layer (see promptComposer).
    const { prompt: finalPrompt, negativePrompt } = composePrompt(cleanPrompt, styleId);
    const finalSeed = effectiveSeed(variation);
    const ratio = getRatio(aspectRatio);
    const geminiReady = hasGeminiKey();

    // Resolve the engine.
    let useGemini = false;
    if (engine === 'gemini') {
      if (!geminiReady) {
        pushToast('error', 'Gemini needs a free API key — open “API Keys” to add one, or switch to the Free engine.');
        setShowSettings(true);
        return;
      }
      useGemini = true;
    } else if (engine === 'auto') {
      useGemini = geminiReady;
    }

    setIsGenerating(true);
    setStatusMessage('');

    const base: Omit<GeneratedImage, 'id' | 'url' | 'sourceUrl' | 'engine' | 'timestamp'> = {
      prompt: finalPrompt,
      originalPrompt: cleanPrompt,
      styleId,
      seed: finalSeed,
      aspectRatio,
      model: undefined,
    };

    try {
      let img: GeneratedImage;

      if (useGemini) {
        setStatusMessage('Contacting Gemini image model…');
        try {
          const { dataUrl, model: geminiModel } = await gemini.generateWithGemini(
            finalPrompt,
            aspectRatio,
            (modelSwitch) => setStatusMessage(modelSwitch),
          );
          img = { ...base, id: uid(), url: dataUrl, sourceUrl: dataUrl, engine: 'gemini', model: geminiModel, timestamp: Date.now() };
        } catch (err: any) {
          // Auto mode: fall back to the free engine if Gemini quota/billing fails.
          if (engine === 'auto') {
            pushToast('wait', `${err.message} Falling back to the free engine…`);
          } else {
            throw err;
          }
          const result = await generateWithPollinations(
            { prompt: finalPrompt, negativePrompt, width: ratio.width, height: ratio.height, seed: finalSeed, model: pollinationsModel },
            setStatusMessage,
          );
          img = { ...base, id: uid(), url: result.displayUrl, sourceUrl: result.sourceUrl, engine: 'pollinations', model: pollinationsModel, timestamp: Date.now() };
        }
      } else {
        setStatusMessage('Contacting the free FLUX engine…');
        const result = await generateWithPollinations(
          { prompt: finalPrompt, negativePrompt, width: ratio.width, height: ratio.height, seed: finalSeed, model: pollinationsModel },
          setStatusMessage,
        );
        img = { ...base, id: uid(), url: result.displayUrl, sourceUrl: result.sourceUrl, engine: 'pollinations', model: pollinationsModel, timestamp: Date.now() };
      }

      showImage(img);
      saveImage(img);
      pushToast('success', 'Image generated and saved to your gallery.');
    } catch (err: any) {
      console.error(err);
      pushToast('error', err?.message ?? 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
      setStatusMessage('');
    }
  };

  const handleEnhance = async () => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const { text, source } = await enhancePromptCascade(cleanPrompt, styleId);
      setPrompt(text);
      if (source === 'gemini') pushToast('success', 'Prompt enhanced with Gemini.');
      else if (source === 'pollinations') pushToast('success', 'Prompt enhanced with the free text model.');
      else pushToast('info', 'Prompt enhanced locally (offline booster).');
    } catch (err: any) {
      pushToast('error', err?.message ?? 'Could not enhance the prompt.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleUpscale = async () => {
    if (!currentImage || isUpscaling) return;
    setIsUpscaling(true);
    try {
      let newUrl: string;
      if (hasGeminiKey() && currentImage.engine === 'gemini') {
        setStatusMessage('AI-enhancing with Gemini…');
        try {
          newUrl = await gemini.upscaleWithGemini(currentImage.url);
        } catch (err: any) {
          pushToast('wait', `${err.message} Using the local enhancer instead…`);
          newUrl = await localUpscale(currentImage.url, setStatusMessage);
        }
      } else {
        newUrl = await localUpscale(currentImage.url, setStatusMessage);
      }
      const updated = { ...currentImage, url: newUrl, sourceUrl: newUrl };
      showImage(updated);
      saveImage(updated);
      pushToast('success', 'Upscaled ×2 with detail sharpening.');
    } catch (err: any) {
      console.error(err);
      pushToast('error', err?.message ?? 'Upscale failed.');
    } finally {
      setIsUpscaling(false);
      setStatusMessage('');
    }
  };

  const handleExport = async (format: ImageFormat) => {
    if (!currentImage) return;
    try {
      await exportImage(currentImage.url, format, `lumina_${currentImage.id.slice(0, 8)}`);
      pushToast('success', `Exported as ${format === 'jpeg' ? 'JPG' : format.toUpperCase()}.`);
    } catch (err: any) {
      console.error(err);
      pushToast('error', err?.message ?? 'Export failed.');
    }
  };

  const handleSelectFromHistory = (img: GeneratedImage) => {
    // Restore the full recipe so the user can iterate on an old creation.
    showImage({ ...img, url: img.url || img.sourceUrl });
    setPrompt(img.originalPrompt);
    setStyleId(img.styleId ?? 'none');
    setAspectRatio(img.aspectRatio);
    if (img.seed !== undefined) setSeed(String(img.seed));
    setView('generate');
  };

  const handleLogout = () => {
    localStorage.removeItem('lumina_user');
    setUser(null);
    setView('generate');
  };

  const isSaved = !!currentImage && history.some((e) => e.id === currentImage.id);
  // keysVersion bumping re-renders the tree, so this re-reads localStorage in time.
  void keysVersion;
  const geminiReadyNow = hasGeminiKey();

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* ============================== FX layers ============================== */}
      <HoloBackground />
      {/* Decorative parallax orbs — translated by --par-x/--par-y (see HoloBackground). */}
      <div className="holo-orb" style={{ left: '12%', top: '22%', width: 90, height: 90, ['--depth' as string]: 0.5, background: 'radial-gradient(circle, rgba(34,211,238,0.14), transparent 70%)' }} aria-hidden />
      <div className="holo-orb" style={{ right: '9%', top: '58%', width: 130, height: 130, ['--depth' as string]: 1.4, background: 'radial-gradient(circle, rgba(232,121,249,0.12), transparent 70%)', animationDelay: '-2.5s' }} aria-hidden />
      <div className="holo-orb" style={{ left: '44%', bottom: '12%', width: 60, height: 60, ['--depth' as string]: 2.2, background: 'radial-gradient(circle, rgba(129,140,248,0.16), transparent 70%)', animationDelay: '-4.8s' }} aria-hidden />
      <HoloCursor />

      {/* ============================== Header ============================== */}
      <header className="sticky top-0 z-40 holo-panel border-b border-cyan-500/10 px-4 md:px-6 py-3.5 flex items-center justify-between gap-3">
        <button onClick={() => setView('generate')} className="flex items-center space-x-2.5 group">
          <div className="relative w-10 h-10 bg-gradient-to-tr from-cyan-600 via-indigo-600 to-fuchsia-500 rounded-xl flex items-center justify-center border border-cyan-300/40 shadow-[0_0_22px_-4px_rgba(34,211,238,0.6)] group-hover:scale-105 transition-transform">
            <span className="text-white font-black text-lg font-display">L</span>
            <span className="absolute inset-0 rounded-xl animate-spin-rev-slow border border-dashed border-cyan-300/25" aria-hidden />
          </div>
          <div className="text-left leading-none">
            <span className="font-display text-xl font-extrabold tracking-[0.08em] holo-text animate-holo-flicker">LUMINA</span>
            <span className="block font-hud text-[8.5px] font-bold tracking-[0.32em] text-cyan-400/80 uppercase mt-1">Holo Station · Free AI</span>
          </div>
        </button>

        <ViewSwitcher view={view} count={history.length} onChange={setView} className="hidden sm:flex" />

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(true)}
            title="API keys & engine settings"
            className="p-2.5 hover:bg-cyan-500/10 rounded-xl transition-colors text-slate-400 hover:text-cyan-200 border border-transparent hover:border-cyan-400/30 hover:shadow-[0_0_16px_-6px_rgba(34,211,238,0.6)]"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
          {user ? (
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-emerald-900/40">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:block text-sm font-semibold text-slate-300 max-w-[110px] truncate">@{user.username}</span>
              <button onClick={handleLogout} title="Remove local profile" className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-500 hover:text-red-400">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="holo-chip text-cyan-100 font-hud text-[11px] font-bold tracking-[0.22em] uppercase px-5 py-2.5 rounded-full"
            >
              Profile
            </button>
          )}
        </div>
      </header>

      {/* ============================== Main ============================== */}
      <main className="flex-1">
        {/* Phone-sized screens get the switcher below the (now nav-free) header. */}
        <ViewSwitcher view={view} count={history.length} onChange={setView} className="flex sm:hidden max-w-7xl mx-auto my-3 px-4" />
        {view === 'generate' ? (
          <div className="relative max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            <div className="lg:col-span-4 space-y-5 relative z-10">
              <Tilt3D max={3.2} scale={1.004} className="h-full">
              <GeneratePanel
                prompt={prompt}
                setPrompt={setPrompt}
                engine={engine}
                setEngine={setEngine}
                pollinationsModel={pollinationsModel}
                setPollinationsModel={setPollinationsModel}
                styleId={styleId}
                setStyleId={setStyleId}
                aspectRatio={aspectRatio}
                setAspectRatio={setAspectRatio}
                seed={seed}
                setSeed={setSeed}
                isGenerating={isGenerating}
                isEnhancing={isEnhancing}
                geminiReady={geminiReadyNow}
                onGenerate={() => handleGenerate(false)}
                onEnhance={handleEnhance}
                onOpenSettings={() => setShowSettings(true)}
              />
              </Tilt3D>

              {!prompt && (
                <div className="holo-panel hud-corners rounded-2xl p-5 space-y-3 animate-fade-in">
                  <p className="font-hud text-[10px] font-bold text-cyan-400/80 uppercase tracking-[0.24em]">▸ Need inspiration?</p>
                  <div className="flex flex-wrap gap-2">
                    {PROMPT_IDEAS.map((idea) => (
                      <button
                        key={idea}
                        onClick={() => setPrompt(idea)}
                        className="holo-chip text-[11px] text-slate-300 hover:text-cyan-100 rounded-full px-3 py-1.5 text-left"
                      >
                        {idea.length > 42 ? idea.slice(0, 42) + '…' : idea}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-8 relative z-10">
              <StageView
                image={currentImage}
                isGenerating={isGenerating}
                isUpscaling={isUpscaling}
                statusMessage={statusMessage}
                onExport={handleExport}
                onUpscale={handleUpscale}
                onVariation={() => handleGenerate(true)}
                onSave={() => currentImage && saveImage(currentImage)}
                isSaved={isSaved}
              />
            </div>
          </div>
        ) : (
          <div className="relative max-w-7xl mx-auto p-4 md:p-10">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="font-display text-4xl md:text-5xl font-extrabold tracking-[0.06em] holo-text">MY GALLERY</h2>
                <p className="font-hud text-cyan-400/70 mt-3 text-xs tracking-[0.08em]">
                  LOCAL ARCHIVE · stored privately in this browser — click any image to reopen its full recipe in the studio.
                </p>
              </div>
              <button
                onClick={() => setView('generate')}
                className="holo-btn font-hud text-[11px] font-bold uppercase tracking-[0.22em] text-white px-7 py-3.5 rounded-full"
              >
                ← Back to Studio
              </button>
            </div>
            <HistoryView
              images={history}
              onSelect={handleSelectFromHistory}
              onDelete={(id) => setHistory((h) => removeFromHistory(h, id))}
              onClearAll={() => setHistory(clearHistory())}
            />
          </div>
        )}
      </main>

      {/* ============================== Footer ============================== */}
      <footer className="relative z-10 mt-auto border-t border-cyan-500/10 px-6 py-4 text-center">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" aria-hidden />
        <p className="font-hud text-[10.5px] text-slate-500 tracking-[0.14em]">
          <span className="text-cyan-400/80">LUMINA</span> · HOLO STATION — FREE FLUX CORE
          {hasGeminiKey() ? <span className="text-fuchsia-400/80"> + GEMINI UPLINK ACTIVE</span> : ''} ·
          ZERO SUBSCRIPTION · NO WATERMARKS · ALL SYNTHESIS IN-BROWSER <span className="text-cyan-400/70 animate-pulse">▮</span>
        </p>
      </footer>

      {showAuth && <AuthModal onLogin={(u) => { setUser(u); setShowAuth(false); }} onClose={() => setShowAuth(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onSaved={() => setKeysVersion((v) => v + 1)} />}
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
