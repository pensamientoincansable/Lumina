import React, { useState } from 'react';
import { User } from '../types';

interface AuthModalProps {
  onLogin: (user: User) => void;
  onClose: () => void;
}

/**
 * Local profile — no server involved. The profile is stored in this browser only
 * and is used to personalize the studio (name, initials avatar, greeting).
 */
const AuthModal: React.FC<AuthModalProps> = ({ onLogin, onClose }) => {
  const [isLogin, setIsLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = username.trim() || email.split('@')[0] || 'creator';
    const user: User = {
      id: Math.random().toString(36).slice(2, 11),
      username: name,
      email: email.trim(),
    };
    localStorage.setItem('lumina_user', JSON.stringify(user));
    onLogin(user);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl shadow-2xl relative animate-zoom-in" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors text-lg leading-none">✕</button>

        <h2 className="text-3xl font-black tracking-tight mb-2 text-center bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
          {isLogin ? 'Welcome Back' : 'Create Your Profile'}
        </h2>
        <p className="text-slate-400 text-center text-sm mb-8 leading-relaxed">
          100% local — no account server, no passwords, no emails sent.
          Your profile lives only in this browser.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Display name</label>
            <input
              type="text"
              required
              maxLength={24}
              placeholder="e.g. starweaver"
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Email <span className="text-slate-600 normal-case font-medium">(optional, never sent anywhere)</span>
              </label>
              <input
                type="email"
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-black text-sm uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-xl shadow-indigo-950/40"
          >
            {isLogin ? 'Continue' : 'Start Creating'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {isLogin ? "Don't have a profile yet?" : 'Already set up on this browser?'}{' '}
          <button onClick={() => setIsLogin(!isLogin)} className="text-indigo-400 hover:text-indigo-300 font-bold">
            {isLogin ? 'Create one' : 'Switch profile'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
