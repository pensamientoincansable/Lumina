/**
 * Persistent creation history (localStorage).
 *
 * History entries are lightweight: for the free engine they hold the remote
 * Pollinations URL (same seed → same cached image, re-downloadable forever).
 * Gemini data-URLs are big, so entries self-trim when the storage quota is hit.
 */

import { GeneratedImage, RATIO_PRESETS } from '../types';

const LS_HISTORY = 'lumina_history_v2';
const MAX_ENTRIES = 30;

const isRatio = (v: unknown): boolean => RATIO_PRESETS.some((r) => r.id === v);

/**
 * Normalizes one persisted record, or returns null when it is unusable.
 *
 * Two real-world repairs happen here:
 *  - `blob:` display URLs are dropped. Object URLs are scoped to the document that
 *    created them, so a URL saved in a previous session can never load again —
 *    storing one is what made every gallery thumbnail render as a broken image
 *    after a reload. The re-fetchable `sourceUrl` is used instead.
 *  - Records from an older/partial schema get their required fields defaulted
 *    instead of throwing later during render.
 */
function normalize(entry: any): GeneratedImage | null {
  if (!entry || typeof entry !== 'object') return null;
  if (typeof entry.sourceUrl !== 'string' || !entry.sourceUrl) return null;

  const url = typeof entry.url === 'string' && entry.url && !entry.url.startsWith('blob:') ? entry.url : entry.sourceUrl;

  return {
    id: typeof entry.id === 'string' && entry.id ? entry.id : `restored_${Math.random().toString(36).slice(2, 10)}`,
    url,
    sourceUrl: entry.sourceUrl,
    prompt: typeof entry.prompt === 'string' ? entry.prompt : '',
    originalPrompt: typeof entry.originalPrompt === 'string' && entry.originalPrompt ? entry.originalPrompt : (typeof entry.prompt === 'string' ? entry.prompt : ''),
    styleId: typeof entry.styleId === 'string' ? entry.styleId : 'none',
    engine: entry.engine === 'gemini' ? 'gemini' : 'pollinations',
    model: typeof entry.model === 'string' ? entry.model : undefined,
    seed: Number.isFinite(entry.seed) ? Number(entry.seed) : undefined,
    timestamp: Number.isFinite(entry.timestamp) ? Number(entry.timestamp) : Date.now(),
    aspectRatio: isRatio(entry.aspectRatio) ? entry.aspectRatio : '1:1',
  };
}

export function loadHistory(): GeneratedImage[] {
  try {
    // Drop the pre-v1 history format (different shape, could not be restored reliably).
    localStorage.removeItem('lumina_history');
    const raw = localStorage.getItem(LS_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const clean = parsed.map(normalize).filter((e): e is GeneratedImage => e !== null);
    // If we repaired anything, write the sanitized list back once.
    if (clean.length !== parsed.length || clean.some((e, i) => e.url !== parsed[i]?.url)) persist(clean);
    return clean;
  } catch {
    // Never let a corrupted gallery take the whole app down.
    return [];
  }
}

function persist(entries: GeneratedImage[]): void {
  let list = entries.slice(0, MAX_ENTRIES);
  // Retry with progressively fewer entries if the quota is exceeded
  // (Gemini data-URLs can weigh 1–2 MB each).
  for (let attempts = 0; attempts < 6; attempts++) {
    try {
      localStorage.setItem(LS_HISTORY, JSON.stringify(list));
      return;
    } catch {
      list = list.slice(0, Math.max(1, Math.floor(list.length / 2)));
    }
  }
  // Last resort: drop history rather than crash the app.
  try {
    localStorage.removeItem(LS_HISTORY);
  } catch {
    /* ignore */
  }
}

export function addToHistory(history: GeneratedImage[], img: GeneratedImage): GeneratedImage[] {
  // `blob:` display URLs are session-scoped: persist the durable URL instead so the
  // gallery still shows the image after a reload.
  const storable: GeneratedImage =
    img.url.startsWith('blob:') ? { ...img, url: img.sourceUrl } : img;
  const updated = [storable, ...history.filter((e) => e.id !== img.id)].slice(0, MAX_ENTRIES);
  persist(updated);
  return updated;
}

export function removeFromHistory(history: GeneratedImage[], id: string): GeneratedImage[] {
  const updated = history.filter((e) => e.id !== id);
  persist(updated);
  return updated;
}

/** Empties the gallery *and* the storage behind it. */
export function clearHistory(): GeneratedImage[] {
  try {
    localStorage.removeItem(LS_HISTORY);
  } catch {
    /* ignore */
  }
  return [];
}
