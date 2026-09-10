import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AspectRatio, Engine, GeneratedImage, ImageFormat, PollinationsModel,
  ToastMessage, User, getRatio, getStyle,
} from './types';
import * as gemini from './services/geminiService';
import { generateWithPollinations } from './services/pollinationsService';
import { enhancePrompt as enhancePromptCascade } from './services/enhanceService';
import { exportImage, localUpscale } from './services/imageTools';
import { hasGeminiKey } from './services/keyStore';
import { addToHistory, loadHistory, removeFromHistory } from './services/historyStore';
import GeneratePanel from './components/GeneratePanel';
import StageView from './components/StageView';
import HistoryView from './components/HistoryView';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import Toasts from './components/Toasts';

const PROMPT_IDEAS = [
  'A lighthouse on a cliff at sunset, giant waves crashing',
  'A cozy ramen shop on a rainy night, steam and lanterns',
  'An astronaut discovering a glowing jungle on an alien planet',
  'A tiny dragon sleeping on a pile of gold coins',
];

let toastSeq = 1;

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
  const [view, setView] = useState<'generate' | 'gallery'>('generate');

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

  const effectiveSeed = (variation: boolean): number => {
    const manual = parseInt(seed, 10);
    if (!Number.isNaN(manual)) return variation ? (manual + 1) % 1_000_000_000 : manual;
    return Math.floor(Math.random() * 1_000_000_000);
  };

  const handleGenerate = async (variation = false) => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isGenerating) return;

    const style = getStyle(styleId);
    const finalPrompt = cleanPrompt + style.suffix;
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
          const dataUrl = await gemini.generateWithGemini(finalPrompt, aspectRatio);
          img = { ...base, id: crypto.randomUUID(), url: dataUrl, sourceUrl: dataUrl, engine: 'gemini', timestamp: Date.now() };
        } catch (err: any) {
          // Auto mode: fall back to the free engine if Gemini quota/billing fails.
          if (engine === 'auto') {
            pushToast('wait', `${err.message} Falling back to the free engine…`);
          } else {
            throw err;
          }
          const result = await generateWithPollinations(
            { prompt: finalPrompt, width: ratio.width, height: ratio.height, seed: finalSeed, model: pollinationsModel },
            setStatusMessage,
          );
          img = { ...base, id: crypto.randomUUID(), url: result.displayUrl, sourceUrl: result.sourceUrl, engine: 'pollinations', model: pollinationsModel, timestamp: Date.now() };
        }
      } else {
        setStatusMessage('Contacting the free FLUX engine…');
        const result = await generateWithPollinations(
          { prompt: finalPrompt, width: ratio.width, height: ratio.height, seed: finalSeed, model: pollinationsModel },
          setStatusMessage,
        );
        img = { ...base, id: crypto.randomUUID(), url: result.displayUrl, sourceUrl: result.sourceUrl, engine: 'pollinations', model: pollinationsModel, timestamp: Date.now() };
      }

      setCurrentImage(img);
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
      setCurrentImage(updated);
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
    setCurrentImage({ ...img, url: img.sourceUrl });
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
    <div className="min-h-screen flex flex-col bg-[#0b0f1a]">
      {/* ============================== Header ============================== */}
      <header className="sticky top-0 z-40 glass-panel border-b border-white/5 px-4 md:px-6 py-3.5 flex items-center justify-between gap-3">
        <button onClick={() => setView('generate')} className="flex items-center space-x-2.5 group">
          <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-fuchsia-400 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <span className="text-white font-black text-lg">L</span>
          </div>
          <div className="text-left leading-none">
            <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">LUMINA</span>
            <span className="block text-[8px] font-bold tracking-[0.3em] text-indigo-400 uppercase mt-0.5">Free AI Studio</span>
          </div>
        </button>

        <nav className="hidden sm:flex items-center space-x-1 bg-slate-900/60 rounded-full p-1 border border-white/5">
          {(['generate', 'gallery'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs font-black tracking-widest uppercase px-5 py-2 rounded-full transition-all ${
                view === v ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              {v === 'generate' ? 'Studio' : `Gallery${history.length ? ` (${history.length})` : ''}`}
            </button>
          ))}
        </nav>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(true)}
            title="API keys & engine settings"
            className="p-2.5 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white border border-transparent hover:border-white/10"
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
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-black tracking-widest uppercase px-5 py-2.5 rounded-full transition-all"
            >
              Profile
            </button>
          )}
        </div>
      </header>

      {/* ============================== Main ============================== */}
      <main className="flex-1">
        {view === 'generate' ? (
          <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            <div className="lg:col-span-4 space-y-5">
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

              {!prompt && (
                <div className="glass-panel rounded-2xl p-5 space-y-3 animate-fade-in">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Need inspiration?</p>
                  <div className="flex flex-wrap gap-2">
                    {PROMPT_IDEAS.map((idea) => (
                      <button
                        key={idea}
                        onClick={() => setPrompt(idea)}
                        className="text-[11px] text-slate-300 bg-slate-900/70 hover:bg-indigo-600/25 border border-white/5 hover:border-indigo-500/40 rounded-full px-3 py-1.5 transition-all text-left"
                      >
                        {idea.length > 42 ? idea.slice(0, 42) + '…' : idea}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-8">
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
          <div className="max-w-7xl mx-auto p-4 md:p-10">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white italic">MY GALLERY</h2>
                <p className="text-slate-500 font-medium mt-2 text-sm">
                  Your creations are stored privately in this browser. Click any image to reopen its full recipe in the studio.
                </p>
              </div>
              <button onClick={() => setView('generate')} className="bg-white text-black px-7 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl">
                ← Back to Studio
              </button>
            </div>
            <HistoryView
              images={history}
              onSelect={handleSelectFromHistory}
              onDelete={(id) => setHistory((h) => removeFromHistory(h, id))}
              onClearAll={() => setHistory([])}
            />
          </div>
        )}
      </main>

      {/* ============================== Footer ============================== */}
      <footer className="border-t border-white/5 px-6 py-4 text-center">
        <p className="text-[11px] text-slate-600">
          Free generation powered by <span className="text-slate-400 font-semibold">Pollinations · FLUX</span>
          {hasGeminiKey() ? ' + Gemini (your key)' : ''} — no subscription, no watermarks on exports, images processed in your browser.
        </p>
      </footer>

      {showAuth && <AuthModal onLogin={(u) => { setUser(u); setShowAuth(false); }} onClose={() => setShowAuth(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onSaved={() => setKeysVersion((v) => v + 1)} />}
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
