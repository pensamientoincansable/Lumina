/**
 * Persistent creation history (localStorage).
 *
 * History entries are lightweight: for the free engine they hold the remote
 * Pollinations URL (same seed → same cached image, re-downloadable forever).
 * Gemini data-URLs are big, so entries self-trim when the storage quota is hit.
 */

import { GeneratedImage } from '../types';

const LS_HISTORY = 'lumina_history_v2';
const MAX_ENTRIES = 30;

export function loadHistory(): GeneratedImage[] {
  try {
    // Drop the pre-v1 history format (different shape, could not be restored reliably).
    localStorage.removeItem('lumina_history');
    const raw = localStorage.getItem(LS_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Remote URLs are displayable as-is; data URLs too.
    return parsed.filter((e) => e && typeof e.url === 'string' && typeof e.sourceUrl === 'string');
  } catch {
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
  const updated = [img, ...history.filter((e) => e.id !== img.id)].slice(0, MAX_ENTRIES);
  persist(updated);
  return updated;
}

export function removeFromHistory(history: GeneratedImage[], id: string): GeneratedImage[] {
  const updated = history.filter((e) => e.id !== id);
  persist(updated);
  return updated;
}
