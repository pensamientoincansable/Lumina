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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="holo-panel hud-corners w-full max-w-md p-8 rounded-3xl shadow-2xl relative animate-zoom-in" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-cyan-200 transition-colors text-lg leading-none">✕</button>

        <h2 className="font-display text-2xl font-bold tracking-[0.08em] mb-3 text-center holo-text">
          {isLogin ? 'Welcome Back' : 'Create Your Profile'}
        </h2>
        <p className="font-hud text-slate-400 text-center text-[11px] mb-8 leading-relaxed tracking-[0.06em]">
          100% LOCAL — NO ACCOUNT SERVER, NO PASSWORDS, NO EMAILS SENT.
          YOUR PROFILE LIVES ONLY IN THIS BROWSER.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-hud text-[10.5px] font-bold text-cyan-300/80 uppercase tracking-[0.2em] mb-1.5">Display name</label>
            <input
              type="text"
              required
              maxLength={24}
              placeholder="e.g. starweaver"
              className="w-full bg-[#02060d] border border-cyan-500/15 rounded-xl px-4 py-2.5 text-sm focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/25 outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          {!isLogin && (
            <div>
              <label className="block font-hud text-[10.5px] font-bold text-cyan-300/80 uppercase tracking-[0.2em] mb-1.5">
                Email <span className="text-slate-600 normal-case font-medium tracking-normal">(optional, never sent anywhere)</span>
              </label>
              <input
                type="email"
                className="w-full bg-[#02060d] border border-cyan-500/15 rounded-xl px-4 py-2.5 text-sm focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/25 outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full holo-btn text-white font-display font-bold text-sm uppercase tracking-[0.24em] py-3.5 rounded-2xl"
          >
            {isLogin ? 'Continue' : 'Start Creating'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {isLogin ? "Don't have a profile yet?" : 'Already set up on this browser?'}{' '}
          <button onClick={() => setIsLogin(!isLogin)} className="text-cyan-300 hover:text-cyan-200 font-bold">
            {isLogin ? 'Create one' : 'Switch profile'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
