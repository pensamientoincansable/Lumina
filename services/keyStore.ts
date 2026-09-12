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
const LS_GEMINI_MODEL_ORDER = 'lumina_gemini_image_model_order';

/**
 * Build-time key injected by Vite's `define` (see vite.config.ts).
 *
 * This must stay the *exact* token `process.env.GEMINI_API_KEY`:
 *  - Vite only substitutes that literal string, so `process.env?.GEMINI_API_KEY`
 *    was left untouched in the bundle;
 *  - and `process` does not exist in the browser, so the previous
 *    `typeof process !== 'undefined' && …` guard short-circuited to `''`,
 *    silently ignoring every key set in `.env.local`.
 * The try/catch keeps it safe if the module is ever evaluated outside a build
 * where the token was not replaced.
 */
function readEnvKey(): string {
  try {
    return process.env.GEMINI_API_KEY || '';
  } catch {
    return '';
  }
}

/** Tolerates quotes / newlines / "Bearer " prefixes pasted from a dashboard. */
function sanitizeKey(value: string): string {
  return value
    .trim()
    .replace(/^Bearer\s+/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

const envGeminiKey = sanitizeKey(readEnvKey());

export function getGeminiKey(): string {
  try {
    return sanitizeKey(localStorage.getItem(LS_GEMINI_KEY) || '') || envGeminiKey || '';
  } catch {
    return envGeminiKey || '';
  }
}

export function setGeminiKey(key: string): void {
  const trimmed = sanitizeKey(key);
  if (trimmed) localStorage.setItem(LS_GEMINI_KEY, trimmed);
  else localStorage.removeItem(LS_GEMINI_KEY);
  // Let the UI re-evaluate engine availability.
  window.dispatchEvent(new Event('lumina:keys-changed'));
}

export function hasGeminiKey(): boolean {
  return getGeminiKey().length > 0;
}

/**
 * Persistent order of Gemini image models (best-first, self-healing):
 * the model that last succeeded is moved to the front, so generation skips
 * models the user's plan does not support without re-discovering them.
 */
export function getGeminiImageModelOrder(): string[] {
  try {
    const raw = localStorage.getItem(LS_GEMINI_MODEL_ORDER) || '';
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function setGeminiImageModelOrder(order: string[]): void {
  try {
    localStorage.setItem(LS_GEMINI_MODEL_ORDER, JSON.stringify(order));
  } catch {
    /* storage full/blocked — the cascade simply re-discovers next time */
  }
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
  const trimmed = sanitizeKey(key);
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
