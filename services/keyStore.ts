/**
 * API key storage.
 *
 * Keys are read (in priority order) from:
 *   1. localStorage  — set by the user in the in-app Settings panel
 *   2. build-time    — GEMINI_API_KEY inside .env.local (injected by Vite `define`)
 *
 * Keys never leave the browser: they are only used to call the providers directly.
 */

const LS_GEMINI_KEY = 'lumina_gemini_api_key';
const LS_POLLINATIONS_KEY = 'lumina_pollinations_key';

const envGeminiKey =
  (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '';

export function getGeminiKey(): string {
  try {
    return localStorage.getItem(LS_GEMINI_KEY) || envGeminiKey || '';
  } catch {
    return envGeminiKey || '';
  }
}

export function setGeminiKey(key: string): void {
  const trimmed = key.trim();
  if (trimmed) localStorage.setItem(LS_GEMINI_KEY, trimmed);
  else localStorage.removeItem(LS_GEMINI_KEY);
  // Let the UI re-evaluate engine availability.
  window.dispatchEvent(new Event('lumina:keys-changed'));
}

export function hasGeminiKey(): boolean {
  return getGeminiKey().length > 0;
}

/** Optional free Pollinations key (publishable `pk_…`) — raises the free rate limit. */
export function getPollinationsKey(): string {
  try {
    return localStorage.getItem(LS_POLLINATIONS_KEY) || '';
  } catch {
    return '';
  }
}

export function setPollinationsKey(key: string): void {
  const trimmed = key.trim();
  if (trimmed) localStorage.setItem(LS_POLLINATIONS_KEY, trimmed);
  else localStorage.removeItem(LS_POLLINATIONS_KEY);
  window.dispatchEvent(new Event('lumina:keys-changed'));
}

/** Where users can obtain free keys — surfaced in the Settings UI and README. */
export const KEY_SOURCES = {
  gemini: {
    name: 'Google AI Studio — Gemini API key',
    url: 'https://aistudio.google.com/apikey',
    note: 'Free, no credit card. Sign in with a Google account → “Get API key”.',
  },
  pollinations: {
    name: 'Pollinations — publishable key',
    url: 'https://enter.pollinations.ai',
    note: 'Free registration. Anonymous use works too; a key raises the rate limit and removes the watermark.',
  },
} as const;
