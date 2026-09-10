export interface User {
  id: string;
  username: string;
  email: string;
}

export type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

export type Engine = 'auto' | 'pollinations' | 'gemini';

export type PollinationsModel = 'flux' | 'turbo';

export interface GeneratedImage {
  id: string;
  /** Displayable URL (object URL, data URL or remote URL). */
  url: string;
  /** Re-fetchable source (remote Pollinations URL or data URL) — kept in history. */
  sourceUrl: string;
  prompt: string;
  originalPrompt: string;
  styleId: string;
  engine: 'pollinations' | 'gemini';
  model?: string;
  seed?: number;
  timestamp: number;
  aspectRatio: AspectRatio;
}

export interface StylePreset {
  id: string;
  label: string;
  /** Appended to the user prompt to steer the model. */
  suffix: string;
  emoji: string;
}

export interface RatioPreset {
  id: AspectRatio;
  label: string;
  width: number;
  height: number;
}

export type ImageFormat = 'png' | 'jpeg' | 'webp';

export interface ToastMessage {
  id: number;
  kind: 'info' | 'success' | 'error' | 'wait';
  text: string;
}

/* ----------------------------- Curated style presets ----------------------------- */

export const STYLE_PRESETS: StylePreset[] = [
  { id: 'none', label: 'No Style', emoji: '✨', suffix: '' },
  { id: 'photoreal', label: 'Photorealistic', emoji: '📷', suffix: ', ultra realistic photograph, 85mm lens, shallow depth of field, natural cinematic lighting, intricate detail, 8k uhd' },
  { id: 'cinematic', label: 'Cinematic', emoji: '🎬', suffix: ', cinematic film still, anamorphic lens flare, dramatic volumetric lighting, subtle film grain, teal and orange grade, epic composition' },
  { id: 'anime', label: 'Anime', emoji: '🌸', suffix: ', anime style, makoto shinkai inspired, cel shading, vibrant colors, clean lineart, beautifully detailed background art' },
  { id: 'digital-art', label: 'Digital Art', emoji: '🎨', suffix: ', stunning digital painting, trending on artstation, concept art, dramatic lighting, rich vibrant colors, sharp focus' },
  { id: 'oil-painting', label: 'Oil Painting', emoji: '🖼️', suffix: ', classical oil painting, visible impasto brushstrokes, rich texture, chiaroscuro lighting, museum masterpiece' },
  { id: 'watercolor', label: 'Watercolor', emoji: '💧', suffix: ', delicate watercolor painting, soft color washes, visible cold-press paper texture, loose expressive brushwork' },
  { id: 'cyberpunk', label: 'Cyberpunk', emoji: '🌃', suffix: ', cyberpunk aesthetic, neon signage, rain-soaked streets, glowing holograms, futuristic dystopia, moody night atmosphere' },
  { id: 'fantasy', label: 'Epic Fantasy', emoji: '🐉', suffix: ', epic high fantasy art, magical atmosphere, ethereal god rays, intricate ornate details, award-winning fantasy illustration' },
  { id: 'render-3d', label: '3D Render', emoji: '🧊', suffix: ', polished 3d render, octane renderer, unreal engine 5, subsurface scattering, ray-traced lighting, studio setup, ultra detailed' },
  { id: 'pixel-art', label: 'Pixel Art', emoji: '👾', suffix: ', detailed pixel art, 16-bit retro game style, limited harmonious color palette, crisp clean pixels' },
  { id: 'sketch', label: 'Pencil Sketch', emoji: '✏️', suffix: ', hand-drawn graphite pencil sketch, expressive crosshatching, detailed line work, textured paper, monochrome' },
  { id: 'comic', label: 'Comic Book', emoji: '💥', suffix: ', bold comic book illustration, strong ink outlines, halftone dot shading, dynamic composition, vibrant pop colors' },
  { id: 'vaporwave', label: 'Vaporwave', emoji: '🌴', suffix: ', vaporwave aesthetic, retro 1980s, pastel pink and cyan gradients, subtle glitch artifacts, dreamy nostalgic grid sunset' },
  { id: 'steampunk', label: 'Steampunk', emoji: '⚙️', suffix: ', steampunk design, brass gears and copper pipework, victorian machinery, drifting steam, warm sepia palette, intricate mechanical detail' },
  { id: 'lowpoly', label: 'Low Poly', emoji: '🔺', suffix: ', low poly 3d art, faceted geometric shapes, soft gradient lighting, minimal clean render, pastel colors' },
  { id: 'isometric', label: 'Isometric', emoji: '🏙️', suffix: ', isometric illustration, clean modern vector style, detailed miniature diorama, soft shadows, bright friendly colors' },
  { id: 'noir', label: 'Neon Noir', emoji: '🕶️', suffix: ', neon noir mood, high contrast chiaroscuro, drifting fog, neon reflections on wet asphalt, mysterious cinematic lighting' },
  { id: 'minimal', label: 'Minimalist', emoji: '◻️', suffix: ', minimalist artwork, simple geometric shapes, generous negative space, flat design, muted elegant palette' },
];

export const NO_STYLE = STYLE_PRESETS[0];

export const RATIO_PRESETS: RatioPreset[] = [
  { id: '1:1', label: 'Square', width: 1024, height: 1024 },
  { id: '4:3', label: 'Classic', width: 1152, height: 864 },
  { id: '3:4', label: 'Portrait', width: 864, height: 1152 },
  { id: '16:9', label: 'Wide', width: 1280, height: 720 },
  { id: '9:16', label: 'Tall', width: 720, height: 1280 },
];

export const getStyle = (id: string): StylePreset =>
  STYLE_PRESETS.find((s) => s.id === id) ?? NO_STYLE;

export const getRatio = (id: AspectRatio): RatioPreset =>
  RATIO_PRESETS.find((r) => r.id === id) ?? RATIO_PRESETS[0];
