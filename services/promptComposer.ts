/**
 * Prompt composition — the "sharp face" fix.
 *
 * Blur in AI portraits comes from three sources, all prompt-side:
 *   1. Resolution   → handled in RATIO_PRESETS (bumped to 1280–1600px class)
 *   2. Depth-of-field cues → the old Photoreal preset asked for "shallow
 *      depth of field", which trains the model to defocus everything but a
 *      point in the frame — usually right across the face. Removed.
 *   3. Missing sharpness intent → every prompt now gets an explicit
 *      "tack-sharp" clause, and prompts that look like they depict a person
 *      get an extra face-specific sharpness booster PLUS a matching negative
 *      prompt (Pollinations accepts `negative_prompt`).
 */

import { getStyle } from '../types';

/**
 * Heuristic: does this prompt depict a face / person?
 * Deliberately broad — a false positive just adds a harmless sharpness clause.
 */
const PERSON_RE =
  /\b(face|portrait|headshot|head shot|close[- ]?up|bust shot|selfie|person|people|crowd|woman|women|man|men|girl|girls|boy|boys|kid|kids|child|children|baby|toddler|infant|teen|teens|adult|couple|family|mother|father|mom|dad|son|daughter|sister|brother|girlfriend|boyfriend|model|model|actor|actress|singer|dancer|warrior|warriors|hero|heroine|knight|knightess|wizard|witch|elf|dwarf|vampire|zombie|alien|android|cyborg|robot|samurai|ninja|monk|priest|priestess|king|queen|prince|princess|emperor|pilot|astronaut|scientist|soldier|marine|policeman|police officer|doctor|nurse|chef|artist|musician|gamer|student|barista|firefighter|clown|jester|goddess|god|angel|demon|viking|pirate|explorer|surfer|skater|athlete|runner|boxer|dancer|ballet|idol|celebrity|villain|monster|goblin|ogre|troll|fairy|mermaid|merman|centaur|minotaur|dragon|pharaoh|saint|martial artist|doppelganger|twin|twins|face|smiling|laughing|crying|frowning|staring|gazing|winking|freckles|beard|moustache|mustache|long hair|short hair|red hair|blonde|brunette|silver hair|white hair|tattoo|glasses|sunglasses|makeup|lipstick)\b/i;

/** Appended to prompts that likely depict a face. */
const FACE_SHARP_BOOSTER =
  ', face in razor-sharp focus, crisp detailed facial features, sharp clear eyes, fine skin texture and hair detail, tack-sharp, no blur';

/** Appended to everything else (landscapes, objects, scenes). */
const GENERAL_SHARP_BOOSTER =
  ', tack-sharp focus, intricate fine detail, no blur, high resolution';

/**
 * Baseline negative prompt (Pollinations `negative_prompt` parameter).
 * Word budget matters: the negative prompt is a URL query param, so the
 * composed pair must stay under the ~300-char cap in pollinationsService —
 * with the FACE part included (it is the whole point for portraits).
 */
const BASE_NEGATIVE =
  'blurry, out of focus, soft focus, low quality, lowres, jpeg artifacts, ' +
  'distorted, deformed, bad anatomy, extra limbs, extra fingers, watermark, text, logo';

/** Extra negatives for portrait-like prompts. */
const FACE_NEGATIVE =
  'blurry face, out-of-focus face, soft face, distorted facial features, ' +
  'deformed eyes, asymmetrical eyes, double face, melted face';

export function isLikelyPortrait(prompt: string): boolean {
  return PERSON_RE.test(prompt);
}

export interface ComposedPrompt {
  /** Final prompt to send to the engine (user text + style + sharpness intent). */
  prompt: string;
  /** Negative prompt (free engine only — Gemini has no such parameter). */
  negativePrompt: string;
}

/**
 * Composes the final prompt pair. Pure & side-effect free so the same
 * pipeline feeds both engines and is trivially unit-testable.
 */
export function composePrompt(cleanPrompt: string, styleId: string): ComposedPrompt {
  const style = getStyle(styleId);
  const base = cleanPrompt.trim().replace(/[\s,]+$/, '');
  const portrait = isLikelyPortrait(base);

  const prompt = [base, style.suffix, portrait ? FACE_SHARP_BOOSTER : GENERAL_SHARP_BOOSTER]
    .map((p) => p.trim().replace(/^[,.\s]+|[,.\s]+$/g, ''))
    .filter(Boolean)
    .join(', ');

  const negativePrompt = portrait ? `${BASE_NEGATIVE}, ${FACE_NEGATIVE}` : BASE_NEGATIVE;
  return { prompt, negativePrompt };
}
