import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

const LOCAL_KEYS = ['lumina_history_v2', 'lumina_history', 'lumina_user'];

/**
 * Last line of defence against the "white screen of death".
 *
 * Without a boundary, any exception thrown while rendering (or inside an effect)
 * makes React unmount the whole tree — the page goes blank and the only trace is
 * a console message. This keeps the failure visible and offers the two escapes
 * that actually recover a broken session: reload, or drop the local data that a
 * corrupted localStorage entry may be poisoning.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Lumina] uncaught render error:', error, info?.componentStack ?? '');
  }

  private clearLocalData = () => {
    try {
      LOCAL_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* storage unavailable — nothing to clean */
    }
    location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a] p-6">
        <div className="glass-panel max-w-2xl w-full rounded-3xl p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-tr from-indigo-600 to-fuchsia-400 flex items-center justify-center text-white font-black text-xl">L</div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Lumina hit an error</h1>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400 mt-0.5">The studio stopped instead of going blank</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">{error.message || 'Unknown error.'}</p>

          {error.stack && (
            <pre className="text-[11px] leading-relaxed text-slate-400 bg-slate-950/70 border border-white/10 rounded-2xl p-4 max-h-64 overflow-auto whitespace-pre-wrap break-words">
              {error.stack}
            </pre>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={() => location.reload()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-colors"
            >
              Reload studio
            </button>
            <button
              onClick={this.clearLocalData}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-colors"
            >
              Clear local data &amp; reload
            </button>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Generated images are not lost: they live in your browser&apos;s local storage, so clearing
            the data is only needed when a corrupted gallery entry is what broke the render.
          </p>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
