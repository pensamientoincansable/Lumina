/**
 * Google Gemini — optional premium engine.
 *
 * A free API key can be created at https://aistudio.google.com/apikey (no credit card).
 * Image generation on the free tier depends on Google's current per-project quota;
 * when it is unavailable the app automatically routes to the free Pollinations engine.
 */

import type { GoogleGenAI } from '@google/genai';
import { getGeminiKey } from './keyStore';
import { AspectRatio } from '../types';

const IMAGE_MODEL = 'gemini-2.5-flash-image';
const TEXT_MODEL = 'gemini-2.5-flash';

// Loaded lazily so the heavy SDK only ships to users who actually configure a key.
async function getAIClient(): Promise<GoogleGenAI> {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new Error('No Gemini API key configured. Add one in Settings or in .env.local (GEMINI_API_KEY).');
  }
  const { GoogleGenAI: Client } = await import('@google/genai');
  return new Client({ apiKey });
}

/** Normalizes provider errors into friendly, actionable messages. */
function friendlyError(err: any): Error {
  const msg = String(err?.message ?? err ?? 'Unknown error');
  if (/API key not valid|API_KEY_INVALID/i.test(msg)) {
    return new Error('Your Gemini API key is not valid. Check it in Settings (get a free one at aistudio.google.com/apikey).');
  }
  if (/quota|429|RESOURCE_EXHAUSTED/i.test(msg)) {
    return new Error('Gemini free quota exhausted for today. Switch the engine to “Free (Pollinations)” or try again tomorrow.');
  }
  if (/403|PERMISSION_DENIED|billing|paid/i.test(msg)) {
    return new Error('This Gemini image model currently requires billing on your project. Use the free Pollinations engine instead.');
  }
  return new Error(msg.slice(0, 220));
}

function extractInlineImage(response: any): string | null {
  for (const part of response?.candidates?.[0]?.content?.parts ?? []) {
    if (part?.inlineData?.data) {
      return `data:${part.inlineData.mimeType ?? 'image/png'};base64,${part.inlineData.data}`;
    }
  }
  return null;
}

/** Enhances a raw prompt into a detailed art prompt (Gemini text model). */
export async function enhancePromptWithGemini(prompt: string): Promise<string> {
  try {
    const ai = await getAIClient();
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents:
        'You are an expert AI-art prompt engineer. Rewrite the user\'s idea as a single, vivid, detailed image-generation prompt. ' +
        'Focus on subject, lighting, textures, camera/composition and mood. Output ONLY the improved prompt, max 90 words, no quotes, no preamble.\n\n' +
        `Idea: "${prompt}"`,
      config: { temperature: 0.8, maxOutputTokens: 220 },
    });
    return response.text?.trim() || prompt;
  } catch (err) {
    throw friendlyError(err);
  }
}

/** Text-to-image with Gemini (returns a data URL). */
export async function generateWithGemini(prompt: string, aspectRatio: AspectRatio): Promise<string> {
  try {
    const ai = await getAIClient();
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: aspectRatio as any } },
    });
    const url = extractInlineImage(response);
    if (!url) throw new Error('Gemini did not return an image (it may have refused the prompt). Try rewording it.');
    return url;
  } catch (err) {
    throw friendlyError(err);
  }
}

/** Image-to-image detail/upscale pass with Gemini (returns a data URL). */
export async function upscaleWithGemini(dataUrl: string): Promise<string> {
  try {
    const ai = await getAIClient();
    const [header, data] = dataUrl.split(',');
    const mimeType = header.split(';')[0].split(':')[1] ?? 'image/png';
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [
          { inlineData: { data, mimeType } },
          { text: 'Recreate this exact image with higher resolution, sharper details and cleaner textures. Keep the same subject, colors and composition.' },
        ],
      },
    });
    const url = extractInlineImage(response);
    if (!url) throw new Error('Gemini did not return an enhanced image.');
    return url;
  } catch (err) {
    throw friendlyError(err);
  }
}
