/**
 * Pollinations.ai — free, key-less image generation (FLUX / Turbo).
 *
 * Anonymous tier: ~1 request every few seconds per IP, possible watermark.
 * A free publishable key (pk_…) from https://enter.pollinations.ai raises those limits.
 *
 * The API is a plain GET endpoint, which makes the resulting URL re-fetchable:
 * we store it in the history so old creations reload for free (same seed → same image,
 * and Pollinations caches by URL).
 */

import { getPollinationsKey } from './keyStore';
import { PollinationsModel } from '../types';

export interface PollinationsRequest {
  prompt: string;
  width: number;
  height: number;
  seed: number;
  model: PollinationsModel;
}

export interface PollinationsResult {
  /** Local object URL for instant display. */
  displayUrl: string;
  /** Canonical remote URL — safe to persist and re-download later. */
  sourceUrl: string;
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [6000, 12000];
const REQUEST_TIMEOUT_MS = 180_000;

export function buildPollinationsUrl(req: PollinationsRequest): string {
  const params = new URLSearchParams({
    width: String(req.width),
    height: String(req.height),
    seed: String(req.seed),
    model: req.model,
    nologo: 'true',
    referrer: 'lumina-creative-studio',
  });
  const key = getPollinationsKey();
  if (key) params.set('key', key);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(req.prompt)}?${params.toString()}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Generates an image and returns both a local object URL (instant preview)
 * and the canonical remote URL (persisted in history / used for exports).
 */
export async function generateWithPollinations(
  req: PollinationsRequest,
  onStatus?: (message: string) => void,
): Promise<PollinationsResult> {
  const sourceUrl = buildPollinationsUrl(req);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      if (attempt > 0) onStatus?.(`Free engine is busy — retrying (attempt ${attempt + 1}/${MAX_ATTEMPTS})…`);
      const res = await fetch(sourceUrl, { signal: controller.signal });
      if (res.ok) {
        const blob = await res.blob();
        if (!blob.type.startsWith('image/')) {
          throw new Error('The free engine returned an unexpected response.');
        }
        return { displayUrl: URL.createObjectURL(blob), sourceUrl };
      }
      // 402/429 = anonymous rate limit, 5xx = transient worker errors → retry.
      if ([402, 429, 500, 502, 503, 504].includes(res.status)) {
        lastError = new Error(`Free engine rate-limited (HTTP ${res.status}).`);
      } else {
        const text = await res.text().catch(() => '');
        throw new Error(`Generation failed (HTTP ${res.status})${text ? `: ${text.slice(0, 140)}` : ''}`);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        lastError = new Error('Generation timed out. The free engine may be overloaded — try again.');
      } else {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
      // Network errors are also retryable.
    } finally {
      clearTimeout(timer);
    }

    if (attempt < MAX_ATTEMPTS - 1) {
      const delay = RETRY_DELAYS_MS[attempt];
      onStatus?.(`Cooling down for ${Math.round(delay / 1000)}s (anonymous free tier)…`);
      await sleep(delay);
    }
  }

  throw lastError ?? new Error('Image generation failed.');
}

/**
 * Free text model — used for the “Enhance prompt” feature when no Gemini key
 * is configured. Returns null on any failure so callers can fall back locally.
 */
export async function pollinationsText(prompt: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ referrer: 'lumina-creative-studio' });
    const key = getPollinationsKey();
    if (key) params.set('key', key);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    const res = await fetch(
      `https://text.pollinations.ai/${encodeURIComponent(prompt)}?${params.toString()}`,
      { signal: controller.signal },
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text || null;
  } catch {
    return null;
  }
}
