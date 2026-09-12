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
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="holo-panel hud-corners max-w-2xl w-full rounded-3xl p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-fuchsia-500 border border-cyan-300/40 flex items-center justify-center text-white font-black text-xl font-display">L</div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-[0.06em] holo-text">Lumina hit an error</h1>
              <p className="font-hud text-[10.5px] font-bold uppercase tracking-[0.24em] text-cyan-400/80 mt-1">The studio stopped instead of going blank</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">{error.message || 'Unknown error.'}</p>

          {error.stack && (
            <pre className="text-[11px] leading-relaxed text-slate-400 bg-[#02060d]/80 border border-cyan-500/15 rounded-2xl p-4 max-h-64 overflow-auto whitespace-pre-wrap break-words">
              {error.stack}
            </pre>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={() => location.reload()}
              className="holo-btn text-white font-hud text-[11px] font-bold uppercase tracking-[0.2em] px-5 py-3 rounded-xl"
            >
              Reload studio
            </button>
            <button
              onClick={this.clearLocalData}
              className="holo-chip text-slate-200 font-hud text-[11px] font-bold uppercase tracking-[0.2em] px-5 py-3 rounded-xl"
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
