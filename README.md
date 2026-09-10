# ✨ Lumina AI · Free Creative Studio

A free AI image-generation studio. It works **out of the box with zero configuration and zero cost** thanks to the Pollinations FLUX engine — and optionally upgrades to Google's Gemini image models if you add a (free) API key.

![stack](https://img.shields.io/badge/React%2019-Vite%206-646cff) ![styles](https://img.shields.io/badge/Tailwind%20CSS-4-38bdf8) ![cost](https://img.shields.io/badge/cost-%240-brightgreen)

## Features

| Feature | Free? | How |
| --- | --- | --- |
| Image generation (FLUX / Turbo) | ✅ always | Pollinations — no account, no key |
| 19 curated art styles (photoreal, anime, cyberpunk, oil painting, pixel art…) | ✅ | Style presets engineered into the prompt |
| 5 aspect ratios (1:1, 4:3, 3:4, 16:9, 9:16) | ✅ | Exact pixel sizes per engine |
| Seed control (reproducible results + variations) | ✅ | Manual seed, 🎲 random, one-click variation |
| Prompt enhancement | ✅ | Cascade: Gemini → free Pollinations text → offline booster |
| Upscale ×2 + detail sharpening | ✅ | Local canvas pipeline (unsharp-mask), or Gemini img2img if a key is set |
| Export PNG / JPG / WebP | ✅ | In-browser conversion, no watermark added |
| Private local gallery (up to 30 creations, full recipe restore) | ✅ | localStorage, self-trimming |
| Gemini engine (optional) | 🔑 free key | `gemini-2.5-flash-image`, falls back to free engine on quota errors |

## Run locally

**Prerequisite:** Node.js 18+

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build → dist/
npm run typecheck
```

### GitHub Pages

The repository includes a GitHub Actions deployment workflow in `.github/workflows/deploy.yml`.
After merging to `main`, enable **Settings → Pages → GitHub Actions** as the Pages source
(if GitHub has not enabled it automatically). The workflow builds the Vite app first and
publishes `dist/`, rather than serving the TypeScript source file directly. This is required
for the app bundle and relative assets to load correctly on a Pages subpath.

No `.env` file is needed for the free engine.

## 🔑 Where to get FREE API keys (no subscription, no credit card)

The app never requires a key, but these free options unlock extras. You can paste them in the app's **⚙ API Keys** panel (stored only in your browser) or in `.env.local`.

| Provider | Get it at | Free limits (as of 2026) | Unlocks in Lumina |
| --- | --- | --- | --- |
| **Google Gemini** | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Key creation is free with a Google account. Text models have a generous free tier; **image-model free quota depends on your project's current tier** (Google has moved image models between free and paid over time — the app auto-falls back to the free engine on quota/billing errors). | Gemini engine, AI prompt enhance, AI upscale |
| **Pollinations** | [enter.pollinations.ai](https://enter.pollinations.ai) | **Anonymous: unlimited FLUX images, ~1 req / 15 s, possible watermark.** Free registration gives a publishable key (`pk_…`) with higher limits and no watermark. | Faster free generation, watermark removal |

Other free/freemium image APIs worth knowing (not wired into this app): Hugging Face Inference Providers (small monthly credit grant), Cloudflare Workers AI (10k neurons/day), OpenRouter (routes some free image models).

> ⚠️ Never commit real API keys. `.env.local` is already git-ignored. Keys entered in the UI stay in your browser's localStorage and are only sent to the provider's own API.

## Project structure

```
App.tsx                       # Orchestrates studio, gallery, toasts, modals
index.tsx / index.html        # Entry point (Vite) + Tailwind 4 stylesheet + boot guard
styles.css                    # Tailwind 4 import + custom animation utilities
types.ts                      # Types + curated style/ratio presets
utils.ts                      # Secure-context-safe ids, blob-URL housekeeping
components/
  GeneratePanel.tsx           # Engine, prompt, styles, formats, seed controls
  StageView.tsx               # Image stage, progress overlay, export bar, lightbox
  HistoryView.tsx             # Local gallery grid (with per-tile image fallbacks)
  SettingsModal.tsx           # Free API key management (links to get them)
  AuthModal.tsx               # Optional local profile (no server)
  Toasts.tsx                  # Notification system
  ErrorBoundary.tsx           # Renders a recovery screen instead of a blank page
services/
  pollinationsService.ts      # Free FLUX/Turbo engine (retry + rate-limit handling)
  geminiService.ts            # Optional Gemini engine (image, enhance, img2img upscale)
  enhanceService.ts           # Prompt-enhance cascade with offline fallback
  imageTools.ts               # PNG/JPG/WebP export + local ×2 sharpen upscale
  historyStore.ts             # Quota-safe localStorage gallery (schema repair + clear)
  keyStore.ts                 # API key storage (localStorage / .env.local)
```

## 🩺 If the page looks blank

The app is built so a failure is never silent — you should get a message, not a white screen.
If you see one of those messages, here is what it means:

| Symptom | Cause | Fix |
| --- | --- | --- |
| “Still loading…” panel after ~15 s | The module graph never finished booting (stale Vite cache behind a dev proxy) | `rm -rf node_modules/.vite && npm run dev` |
| “Could not load the app bundle” | The JS entry 404’d (wrong `base`, blocked asset) | `npm run build` and serve `dist/`; relative `base: './'` already covers sub-paths |
| “Lumina hit an error” card | An exception escaped a render/effect | Reload, or “Clear local data & reload” if a corrupted gallery entry poisoned storage |
| Only a dark background, no message | CSS/JS blocked by an extension | Disable the blocker for this origin, then reload |
| Gallery tiles say “Unavailable offline” | Saved images come from `image.pollinations.ai`, unreachable here | Generate again once the network is available — prompts/seeds are restored from the tile |

Notes for hosts where external requests are blocked (sandboxes, corporate networks, some
countries): Google Fonts is loaded **non-render-blocking**, so it can never delay the first
paint, and every remote failure (image host, text host) degrades to a clear toast plus an
offline fallback. The only thing you genuinely need reachable is `image.pollinations.ai`
(and `generativelanguage.googleapis.com` if you use the Gemini engine).
