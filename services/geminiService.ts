/**
 * Google Gemini — optional premium engine.
 *
 * A free API key can be created at https://aistudio.google.com/apikey (no
 * credit card). Which image models a key can use depends on the project's
 * tier, so generation runs a *model cascade*: the best available image model
 * first, falling back to the next one and remembering the working order, so
 * later generations skip models the plan does not support.
 *
 * Current image models (Sept 2026):
 *   - gemini-3-pro-image      "Nano Banana Pro" — 4K class, highest quality
 *   - gemini-3.1-flash-image  "Nano Banana" fast — 2K output, high volume
 *   - gemini-2.5-flash-image  original Nano Banana — widest free-tier support
 */

import type { GoogleGenAI } from '@google/genai';
import { getGeminiKey, getGeminiImageModelOrder, setGeminiImageModelOrder } from './keyStore';
import { AspectRatio } from '../types';

const TEXT_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];

export interface GeminiImageModelSpec {
  id: string;
  label: string;
  /** Output resolution class (Gemini 3 image models accept 1K/2K/4K). */
  imageSize?: '1K' | '2K';
}

/** Best first; the runtime order self-heals (see keyStore). */
export const IMAGE_MODELS: GeminiImageModelSpec[] = [
  { id: 'gemini-3-pro-image', label: 'Gemini 3 Pro (4K)', imageSize: '2K' },
  { id: 'gemini-3.1-flash-image', label: 'Gemini 3.1 Flash (2K)', imageSize: '2K' },
  { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash (1K)' },
];

// Loaded lazily so the heavy SDK only ships to users who actually configure a key.
async function getAIClient(): Promise<GoogleGenAI> {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new Error('No Gemini API key configured. Add one in Settings or in .env.local (GEMINI_API_KEY).');
  }
  const { GoogleGenAI: Client } = await import('@google/genai');
  return new Client({ apiKey });
}

/* ----------------------------- error handling ----------------------------- */

type ErrorKind = 'fatal' | 'model-unavailable';

/**
 * Classifies an API error.
 *  - fatal:            invalid key / network — no point trying other models
 *  - model-unavailable: this model is not on the caller's plan (404, billing,
 *                       not-enabled) → try the next model in the cascade
 */
function classifyError(err: any): { kind: ErrorKind; message: string } {
  const msg = String(err?.message ?? err ?? 'Unknown error');

  if (/API key not valid|API_KEY_INVALID|API_KEY_NOT_FOUND|API_KEY_INVALID|Invalid API key/i.test(msg)) {
    return { kind: 'fatal', message: 'Your Gemini API key is not valid. Check it in Settings (get a free one at aistudio.google.com/apikey).' };
  }
  if (/failed to fetch|networkerror|load failed|err_name_not_resolved|err_connection|cors|timeout|timed out/i.test(msg)) {
    return { kind: 'fatal', message: 'Could not reach Google’s API from this browser. Check your connection (or an ad-blocker/firewall) and try again.' };
  }
  if (/quota|429|RESOURCE_EXHAUSTED|rate limit/i.test(msg)) {
    return { kind: 'model-unavailable', message: 'rate limit reached' };
  }
  if (/404|MODEL_NOT_FOUND|not found|does not exist|not available|has not been trained|no model found|is not a valid model/i.test(msg)) {
    return { kind: 'model-unavailable', message: 'not available on this plan' };
  }
  if (/403|PERMISSION_DENIED|billing|paid|BILLING_PERMISSION|API disabled|not enabled/i.test(msg)) {
    return { kind: 'model-unavailable', message: 'requires billing on this project' };
  }
  // Other 400s (bad config, etc.) — keep trying; the cascade ends with the raw message.
  if (/400|INVALID_ARGUMENT/i.test(msg)) {
    return { kind: 'model-unavailable', message: msg.slice(0, 160) };
  }
  return { kind: 'fatal', message: msg.slice(0, 220) };
}

/** Normalizes a final (exhausted-cascade or fatal) error into a friendly message. */
function friendlyError(err: any): Error {
  return new Error(classifyError(err).message);
}

/* ----------------------------- response parsing ----------------------------- */

function extractInlineImage(response: any): string | null {
  for (const part of response?.candidates?.[0]?.content?.parts ?? []) {
    if (part?.inlineData?.data || part?.inline_data?.data) {
      const inline = part.inlineData ?? part.inline_data;
      return `data:${inline.mimeType ?? inline.mime_type ?? 'image/png'};base64,${inline.data}`;
    }
  }
  return null;
}

function extractText(response: any): string {
  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p: any) => p?.text ?? '').join(' ').trim();
  return text;
}

function isRefusal(response: any): boolean {
  const cand = response?.candidates?.[0];
  const reason = String(cand?.finishReason ?? cand?.finish_reason ?? '');
  return ['SAFETY', 'IMAGE_SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST'].includes(reason) ||
    response?.promptFeedback?.blockReason === 'SAFETY';
}

/* ----------------------------- image generation ----------------------------- */

export interface GeminiGenerationResult {
  /** data: URL of the generated image. */
  dataUrl: string;
  /** Model id that actually produced the image. */
  model: string;
}

/**
 * Text-to-image with a resilient model cascade.
 * `onModelSwitch` reports (non-fatally) that a model was skipped, so the UI
 * can show why generation took an extra second.
 */
export async function generateWithGemini(
  prompt: string,
  aspectRatio: AspectRatio,
  onModelSwitch?: (message: string) => void,
): Promise<GeminiGenerationResult> {
  const ai = await getAIClient();
  const { Modality } = await import('@google/genai');
  const order = imageModelOrder();
  const skipped: string[] = [];
  let lastMessage = 'Gemini image generation failed.';

  for (const modelId of order) {
    const spec = IMAGE_MODELS.find((m) => m.id === modelId) ?? IMAGE_MODELS[IMAGE_MODELS.length - 1];
    try {
      const response = await ai.models.generateContent({
        model: spec.id,
        contents: { parts: [{ text: prompt }] },
        config: {
          // Image-only output prevents "text instead of image" replies.
          responseModalities: [Modality.IMAGE],
          imageConfig: {
            aspectRatio: aspectRatio,
            ...(spec.imageSize ? { imageSize: spec.imageSize } : {}),
          },
        },
      });

      if (isRefusal(response)) {
        throw new Error('The model refused this prompt (safety policy). Try rewording it.');
      }
      const dataUrl = extractInlineImage(response);
      if (!dataUrl) {
        const text = extractText(response);
        throw new Error(
          text
            ? `Gemini replied with text instead of an image: “${text.slice(0, 140)}”`
            : 'Gemini did not return an image (it may have refused the prompt). Try rewording it.',
        );
      }

      rememberModelOrder(order, spec.id);
      return { dataUrl, model: spec.id };
    } catch (err: any) {
      const { kind, message } = classifyError(err);
      if (kind === 'fatal') throw new Error(message);
      if (/refused this prompt|replied with text|did not return an image/.test(message)) {
        throw new Error(message); // prompt problem — same result on every model
      }
      // Model not usable on this plan → remember it last and try the next one.
      lastMessage = `${spec.label}: ${message}`;
      skipped.push(spec.id);
      if (skipped.length < order.length) {
        onModelSwitch?.(`${spec.label} unavailable (${message}) — trying the next model…`);
      }
    }
  }

  throw new Error(lastMessage);
}

/** Image-to-image detail/upscale pass (returns a data URL). */
export async function upscaleWithGemini(dataUrl: string, onModelSwitch?: (message: string) => void): Promise<string> {
  const ai = await getAIClient();
  const { Modality } = await import('@google/genai');
  const [header, data] = dataUrl.split(',');
  const mimeType = header.split(';')[0].split(':')[1] ?? 'image/png';
  const order = imageModelOrder();
  let lastMessage = 'Gemini upscale failed.';

  for (const modelId of order) {
    const spec = IMAGE_MODELS.find((m) => m.id === modelId) ?? IMAGE_MODELS[IMAGE_MODELS.length - 1];
    try {
      const response = await ai.models.generateContent({
        model: spec.id,
        contents: {
          parts: [
            { inlineData: { data, mimeType } },
            { text: 'Recreate this exact image at higher resolution with sharper details and cleaner textures. Keep the same subject, colors and composition. Faces must be crisp and in perfect focus.' },
          ],
        },
        config: { responseModalities: [Modality.IMAGE] },
      });
      if (isRefusal(response)) throw new Error('The model refused to enhance this image.');
      const url = extractInlineImage(response);
      if (!url) throw new Error('Gemini did not return an enhanced image.');
      rememberModelOrder(order, spec.id);
      return url;
    } catch (err: any) {
      const { kind, message } = classifyError(err);
      if (kind === 'fatal' || /refused|did not return/.test(message)) throw new Error(message);
      lastMessage = `${spec.label}: ${message}`;
      onModelSwitch?.(`${spec.label} unavailable — trying the next model…`);
    }
  }
  throw new Error(lastMessage);
}

/* ----------------------------- prompt enhancement ----------------------------- */

/** Enhances a raw prompt into a detailed art prompt (Gemini text model). */
export async function enhancePromptWithGemini(prompt: string): Promise<string> {
  const ai = await getAIClient();
  let lastErr: any;
  for (const model of TEXT_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents:
          'You are an expert AI-art prompt engineer. Rewrite the user\'s idea as a single, vivid, detailed image-generation prompt. ' +
          'Keep the subject exactly as described, especially any faces or people. ' +
          'Focus on subject, lighting, textures, camera/composition and mood. ' +
          'Always end with: "sharp focus, crisp fine detail, no blur". Output ONLY the improved prompt, max 90 words, no quotes, no preamble.\n\n' +
          `Idea: "${prompt}"`,
        config: { temperature: 0.8, maxOutputTokens: 220 },
      });
      return response.text?.trim() || prompt;
    } catch (err) {
      const { kind, message } = classifyError(err);
      if (kind === 'fatal') throw new Error(message);
      lastErr = err;
    }
  }
  throw friendlyError(lastErr);
}

/* ----------------------------- key verification ----------------------------- */

export interface KeyCheckResult {
  ok: boolean;
  message: string;
  /** Round-trip time in ms (when the call reached the API). */
  ms: number | null;
}

/**
 * Validates a key against a lightweight *text* model — the most generous
 * part of the free tier — so "does my key work?" gets an answer in ~1s
 * without spending image quota.
 */
export async function verifyGeminiKey(): Promise<KeyCheckResult> {
  const started = Date.now();
  const ms = () => Date.now() - started;
  let lastErr: any;
  try {
    const ai = await getAIClient();
    for (const model of TEXT_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: 'Reply with exactly one word: OK',
          config: { temperature: 0, maxOutputTokens: 8 },
        });
        const text = response.text?.trim();
        if (text) return { ok: true, message: `Key is valid — ${model} answered in ${ms()} ms.`, ms: ms() };
      } catch (err) {
        const { kind, message } = classifyError(err);
        if (kind === 'fatal') return { ok: false, message, ms: ms() };
        lastErr = err;
      }
    }
    const message = lastErr ? friendlyError(lastErr).message : 'No text model responded.';
    return { ok: false, message, ms: ms() };
  } catch (err) {
    return { ok: false, message: friendlyError(err).message, ms: ms() };
  }
}

/* ----------------------------- model ordering memory ----------------------------- */

function imageModelOrder(): string[] {
  const known = new Set(IMAGE_MODELS.map((m) => m.id));
  const stored = getGeminiImageModelOrder().filter((id) => known.has(id));
  const missing = IMAGE_MODELS.map((m) => m.id).filter((id) => !stored.includes(id));
  return [...stored, ...missing];
}

/** Keeps the order that just worked at the front; failures sink to the end. */
function rememberModelOrder(order: string[], winner: string): void {
  setGeminiImageModelOrder([winner, ...order.filter((id) => id !== winner)]);
}
