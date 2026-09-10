import React from 'react';
import { ToastMessage } from '../types';

const KIND_STYLES: Record<ToastMessage['kind'], { bar: string; icon: React.ReactElement }> = {
  info: {
    bar: 'border-indigo-500/40',
    icon: (
      <svg className="h-4 w-4 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  },
  success: {
    bar: 'border-emerald-500/40',
    icon: (
      <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
  },
  error: {
    bar: 'border-red-500/40',
    icon: (
      <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
  },
  wait: {
    bar: 'border-amber-500/40',
    icon: (
      <svg className="h-4 w-4 text-amber-400 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    ),
  },
};

const Toasts: React.FC<{ toasts: ToastMessage[]; onDismiss: (id: number) => void }> = ({ toasts, onDismiss }) => (
  <div className="fixed bottom-5 right-5 z-[70] flex flex-col gap-3 w-[min(92vw,380px)]">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`glass-panel border ${KIND_STYLES[t.kind].bar} rounded-2xl px-4 py-3 flex items-start gap-3 shadow-2xl animate-slide-up`}
        role="status"
      >
        <span className="mt-0.5 shrink-0">{KIND_STYLES[t.kind].icon}</span>
        <p className="text-sm text-slate-200 leading-snug flex-1">{t.text}</p>
        <button onClick={() => onDismiss(t.id)} className="text-slate-500 hover:text-white text-sm leading-none shrink-0">✕</button>
      </div>
    ))}
  </div>
);

export default Toasts;
