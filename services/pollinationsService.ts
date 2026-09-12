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
  /** What to avoid — e.g. "blurry, out of focus" (kept short: URL-length bound). */
  negativePrompt?: string;
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
/** Transient engine problems worth waiting for. */
const RETRYABLE_STATUS = [402, 429, 500, 502, 503, 504];

/** Signals "retrying is pointless" so the caller fails fast with a clear message. */
class PermanentError extends Error {}

function describeNetworkError(err: unknown): Error {
  const name = (err as any)?.name;
  if (name === 'AbortError') {
    return new Error('Generation timed out. The free engine may be overloaded — try again.');
  }
  // fetch() rejects with TypeError for DNS/offline/CORS/blocked-host failures, which
  // used to surface as an opaque "Failed to fetch".
  return new Error(
    'Could not reach image.pollinations.ai. Your network may be offline, or the host is '
    + 'blocked (firewall, ad-blocker, corporate proxy). Check the connection and try again.',
  );
}

export function buildPollinationsUrl(req: PollinationsRequest): string {
  const params = new URLSearchParams({
    width: String(req.width),
    height: String(req.height),
    seed: String(req.seed),
    model: req.model,
    nologo: 'true',
    referrer: 'lumina-creative-studio',
  });
  if (req.negativePrompt) {
    // Keep the URL lean — the negative prompt is a query param and very long
    // ones risk truncation by proxies. 280 chars comfortably holds the full
    // blur-fix pair (284 chars) with room for the rest of the URL.
    params.set('negative_prompt', req.negativePrompt.slice(0, 300));
  }
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
      let res: Response;
      try {
        res = await fetch(sourceUrl, { signal: controller.signal });
      } catch (err) {
        throw new PermanentError(describeNetworkError(err).message, { cause: err });
      }
      if (res.ok) {
        const blob = await res.blob();
        if (!blob.type.startsWith('image/')) {
          throw new PermanentError('The free engine returned an unexpected response (not an image). It may be down for maintenance — try again in a minute.');
        }
        if (!blob.size) {
          throw new PermanentError('The free engine returned an empty image. Try generating again.');
        }
        return { displayUrl: URL.createObjectURL(blob), sourceUrl };
      }
      const body = await res.text().catch(() => '');
      // 402/429 = anonymous rate limit, 5xx = transient worker errors → retry.
      if (RETRYABLE_STATUS.includes(res.status)) {
        lastError = new Error(
          res.status === 429 || res.status === 402
            ? `The free engine is rate-limiting anonymous requests (HTTP ${res.status}).`
            : `The free engine is unavailable right now (HTTP ${res.status}).`,
        );
      } else {
        throw new PermanentError(`Generation failed (HTTP ${res.status})${body ? `: ${body.slice(0, 140)}` : ''}`);
      }
    } catch (err: any) {
      // A permanent failure (bad prompt, blocked host, 4xx) must not burn 3 attempts
      // and ~18s of cooldown before telling the user.
      if (err instanceof PermanentError) throw err;
      if (err?.name === 'AbortError') {
        lastError = describeNetworkError(err);
      } else {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
      // Any other error (network blip, aborted stream) is retryable.
    } finally {
      clearTimeout(timer);
    }

    if (attempt < MAX_ATTEMPTS - 1) {
      const delay = RETRY_DELAYS_MS[attempt];
      onStatus?.(`Cooling down for ${Math.round(delay / 1000)}s (anonymous free tier)…`);
      await sleep(delay);
    }
  }

  throw lastError ?? new Error('Image generation failed after several attempts. The free engine is likely congested — please try again.');
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
    try {
      const res = await fetch(
        `https://text.pollinations.ai/${encodeURIComponent(prompt)}?${params.toString()}`,
        { signal: controller.signal },
      );
      // A 200 whose body is an HTML error page would otherwise be injected into the
      // prompt box, so only accept plain text back.
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || type.includes('text/html')) return null;
      const text = (await res.text()).trim();
      return text && text.length < 5000 ? text : null;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}
