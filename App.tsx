
import React, { useState, useEffect, useCallback } from 'react';
import { User, GeneratedImage, AspectRatio, ImageFormat } from './types';
import * as gemini from './services/geminiService';
import AuthModal from './components/AuthModal';
import HistoryView from './components/HistoryView';

const STYLES = [
  'None', 'Cinematic', 'Realistic Photography', 'Anime Style', 
  'Cyberpunk', 'Oil Painting', 'Digital Art', '3D Render', 
  'Steampunk', 'Sketch', 'Vaporwave', 'Pixel Art'
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [view, setView] = useState<'generate' | 'gallery'>('generate');
  
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('None');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [animationUrl, setAnimationUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedImage[]>([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('lumina_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    const savedHistory = localStorage.getItem('lumina_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  const saveToHistory = useCallback((img: GeneratedImage) => {
    const updated = [img, ...history];
    setHistory(updated);
    localStorage.setItem('lumina_history', JSON.stringify(updated));
  }, [history]);

  const deleteFromHistory = (id: string) => {
    const updated = history.filter(img => img.id !== id);
    setHistory(updated);
    localStorage.setItem('lumina_history', JSON.stringify(updated));
  };

  const handleEnhancePrompt = async () => {
    if (!prompt) return;
    setIsEnhancing(true);
    try {
      const enhanced = await gemini.enhancePrompt(prompt);
      setPrompt(enhanced);
    } catch (error) {
      console.error(error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setAnimationUrl(null);
    try {
      const url = await gemini.generateImage(prompt, selectedStyle, aspectRatio);
      const newImg: GeneratedImage = {
        id: Math.random().toString(36).substr(2, 9),
        url,
        prompt: selectedStyle !== 'None' ? `${prompt} (${selectedStyle})` : prompt,
        originalPrompt: prompt,
        timestamp: Date.now(),
        aspectRatio,
        format: 'image/png'
      };
      setCurrentImage(newImg);
    } catch (error) {
      console.error(error);
      alert('Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnimate = async () => {
    if (!currentImage) return;

    // Check for API key (Veo requirement)
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        alert("This feature requires a selected API key for high-quality video generation.");
        await (window as any).aistudio.openSelectKey();
        // Proceeding anyway as per instructions (assume success)
      }
    }

    setIsAnimating(true);
    try {
      const videoUrl = await gemini.generateMotion(currentImage.url, currentImage.prompt, aspectRatio);
      setAnimationUrl(videoUrl);
    } catch (error) {
      console.error(error);
      alert('Animation failed. Please try a different image.');
    } finally {
      setIsAnimating(false);
    }
  };

  const handleUpscale = async () => {
    if (!currentImage) return;
    setIsUpscaling(true);
    try {
      const enhancedUrl = await gemini.upscaleImage(currentImage.url);
      setCurrentImage({ ...currentImage, url: enhancedUrl });
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpscaling(false);
    }
  };

  const handleDownload = async (format: ImageFormat) => {
    if (!currentImage) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentImage.url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL(format);
      const link = document.createElement('a');
      const ext = format.split('/')[1];
      link.download = `lumina_${currentImage.id}.${ext}`;
      link.href = dataUrl;
      link.click();
    };
  };

  const handleLogout = () => {
    localStorage.removeItem('lumina_user');
    setUser(null);
    setView('generate');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f1a]">
      <header className="sticky top-0 z-40 glass-panel border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-400 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-white font-black text-xl">L</span>
          </div>
          <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">LUMINA AI</span>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          <button onClick={() => setView('generate')} className={`text-sm font-bold tracking-widest uppercase transition-all ${view === 'generate' ? 'text-indigo-400 border-b-2 border-indigo-400 pb-1' : 'text-slate-500 hover:text-white'}`}>Studio</button>
          <button onClick={() => setView('gallery')} className={`text-sm font-bold tracking-widest uppercase transition-all ${view === 'gallery' ? 'text-indigo-400 border-b-2 border-indigo-400 pb-1' : 'text-slate-500 hover:text-white'}`}>Gallery</button>
        </nav>

        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-slate-300">@{user.username}</span>
              <button onClick={handleLogout} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black tracking-widest uppercase px-6 py-2.5 rounded-full transition-all shadow-xl shadow-indigo-600/30">Sign In</button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        {view === 'generate' ? (
          <div className="max-w-7xl mx-auto p-4 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-8">
              <div className="glass-panel p-8 rounded-3xl space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Core Prompt</label>
                    <button onClick={handleEnhancePrompt} disabled={isEnhancing || !prompt} className="text-xs font-bold text-emerald-400 hover:text-emerald-300 disabled:opacity-30 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${isEnhancing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      ENHANCE
                    </button>
                  </div>
                  <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe anything you can imagine..." className="w-full h-32 bg-slate-900/80 border border-white/5 rounded-2xl p-5 text-white text-sm placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all shadow-inner" />
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Art Style</label>
                  <select value={selectedStyle} onChange={(e) => setSelectedStyle(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500">
                    {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['1:1', '16:9', '9:16'] as AspectRatio[]).map((ratio) => (
                      <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`py-2 rounded-xl text-xs font-bold border transition-all ${aspectRatio === ratio ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'}`}>
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleGenerate} disabled={isGenerating || !prompt} className={`w-full py-5 rounded-2xl font-black text-sm tracking-widest uppercase transition-all shadow-2xl ${isGenerating ? 'bg-slate-800 text-slate-500 cursor-wait' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-[1.02] text-white hover:shadow-indigo-500/40'}`}>
                  {isGenerating ? 'Synthesizing...' : 'Generate Image'}
                </button>
              </div>

              {currentImage && (
                <div className="glass-panel p-8 rounded-3xl space-y-6 animate-in slide-in-from-bottom-8 duration-700">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Lab Tools</label>
                  <div className="grid grid-cols-1 gap-3">
                    <button onClick={handleAnimate} disabled={isAnimating} className="flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isAnimating ? 'animate-bounce' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      {isAnimating ? 'Animating...' : 'Generate Motion (GIF)'}
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={handleUpscale} disabled={isUpscaling} className="bg-slate-800 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 hover:bg-slate-700 transition-colors">
                        {isUpscaling ? 'Upscaling...' : 'AI Upscale'}
                      </button>
                      <button onClick={() => { if(!user) { setShowAuth(true); return; } saveToHistory(currentImage); alert('Saved!'); }} className="bg-slate-800 text-indigo-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 hover:bg-indigo-500/10 transition-colors">Save to Profile</button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center block">Export Format</label>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(ImageFormat).map(([key, value]) => (
                        <button key={key} onClick={() => handleDownload(value)} className="bg-slate-900 border border-white/5 hover:border-indigo-500/50 text-[10px] font-bold py-2.5 rounded-lg transition-all text-slate-400 hover:text-white">
                          {key}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-8">
              <div className="glass-panel rounded-[40px] aspect-[1.2] w-full relative overflow-hidden flex items-center justify-center border-white/5 shadow-2xl">
                {animationUrl ? (
                  <video src={animationUrl} autoPlay loop muted className="w-full h-full object-contain animate-in fade-in duration-1000" />
                ) : currentImage ? (
                  <img src={currentImage.url} alt="Output" className="w-full h-full object-contain animate-in zoom-in-95 duration-1000" />
                ) : (
                  <div className="text-center space-y-4 p-10 opacity-20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-2xl font-black tracking-tighter uppercase italic">Ready for creation</p>
                  </div>
                )}

                {(isGenerating || isAnimating) && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center space-y-8 z-50 backdrop-blur-2xl">
                    <div className="relative">
                      <div className="w-32 h-32 border-8 border-indigo-500/10 rounded-full"></div>
                      <div className="absolute inset-0 w-32 h-32 border-t-8 border-indigo-500 rounded-full animate-spin"></div>
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-black text-white tracking-widest uppercase italic">{isAnimating ? 'Animating Pixels' : 'Painting Dreamscape'}</h3>
                      <p className="text-indigo-400 text-sm font-medium animate-pulse">{isAnimating ? 'Deep Learning Motion Generation...' : 'Synthesizing textures and lighting...'}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {animationUrl && (
                 <div className="mt-6 flex justify-center">
                    <a href={animationUrl} download="lumina_animation.mp4" className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 px-8 py-3 rounded-full border border-indigo-500/30 text-sm font-black uppercase tracking-widest transition-all">
                      Download Motion (MP4/GIF)
                    </a>
                 </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto p-10">
            <div className="flex items-end justify-between mb-12">
              <div>
                <h2 className="text-5xl font-black tracking-tighter text-white italic">MY ARCHIVE</h2>
                <p className="text-slate-500 font-medium mt-2">Personal collection of generated visions.</p>
              </div>
              <button onClick={() => setView('generate')} className="bg-white text-black px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Back to Studio</button>
            </div>
            <HistoryView images={history} onSelect={(img) => { setCurrentImage(img); setAnimationUrl(null); setView('generate'); }} onDelete={deleteFromHistory} />
          </div>
        )}
      </main>

      {showAuth && <AuthModal onLogin={(u) => { setUser(u); setShowAuth(false); }} onClose={() => setShowAuth(false)} />}
    </div>
  );
};

export default App;
