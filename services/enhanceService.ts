/**
 * “Enhance prompt” cascade:
 *   1. Gemini text model      — if the user configured a free API key
 *   2. Pollinations free text — no key needed
 *   3. Local template booster — offline, always available
 */

import { enhancePromptWithGemini } from './geminiService';
import { pollinationsText } from './pollinationsService';
import { hasGeminiKey } from './keyStore';
import { getStyle } from '../types';

const QUALITY_BOOSTERS = [
  'masterpiece, best quality',
  'highly detailed, sharp focus',
  'dramatic lighting, rich colors',
  'professional composition, 8k',
  'intricate details, award-winning',
];

function localEnhance(prompt: string, styleId?: string): string {
  const style = styleId ? getStyle(styleId) : undefined;
  const booster = QUALITY_BOOSTERS[Math.floor(Math.random() * QUALITY_BOOSTERS.length)];
  const parts = [prompt.trim().replace(/[.\s]+$/, ''), booster];
  if (style?.suffix) parts.push(style.suffix.replace(/^,\s*/, ''));
  parts.push('perfect composition');
  return parts.join(', ');
}

/**
 * Returns an improved prompt. `onFallback` lets the UI know which path was used.
 */
export async function enhancePrompt(
  prompt: string,
  styleId?: string,
): Promise<{ text: string; source: 'gemini' | 'pollinations' | 'local' }> {
  if (hasGeminiKey()) {
    try {
      const text = await enhancePromptWithGemini(prompt);
      if (text && text.length > 3) return { text, source: 'gemini' };
    } catch {
      // fall through to the free path
    }
  }

  const instruction =
    'Rewrite the following idea as a single vivid, detailed AI image-generation prompt (subject, lighting, textures, composition, mood). ' +
    'Reply with ONLY the prompt, max 80 words, no quotes:\n' + prompt;
  const freeText = await pollinationsText(instruction);
  if (freeText && freeText.length > 3 && freeText.length < 700) {
    return { text: freeText.replace(/^["']|["']$/g, '').trim(), source: 'pollinations' };
  }

  return { text: localEnhance(prompt, styleId), source: 'local' };
}
