/**
 * Browser-side image utilities: multi-format export and a free local upscale.
 * Everything runs on a canvas — no server, no cost.
 */

import { ImageFormat } from '../types';

const MIME: Record<ImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

async function loadBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load image (HTTP ${res.status}).`);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

/** Downloads the current image converted to the requested format. */
export async function exportImage(url: string, format: ImageFormat, filename: string): Promise<void> {
  const bitmap = await loadBitmap(url);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');

  // JPEG has no alpha — flatten onto white to avoid black backgrounds.
  if (format === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, MIME[format], format === 'png' ? undefined : 0.92),
  );
  if (!blob) throw new Error(`Your browser cannot encode ${format.toUpperCase()} files.`);
  triggerDownload(URL.createObjectURL(blob), `${filename}.${format === 'jpeg' ? 'jpg' : format}`);
}

function triggerDownload(href: string, filename: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

/**
 * Free local “upscale”: 2× high-quality resampling + unsharp-mask style
 * sharpening convolution. Instant, offline, works without any API key.
 * (With a Gemini key the AI-enhance path is used instead.)
 */
export async function localUpscale(url: string, onProgress?: (msg: string) => void): Promise<string> {
  onProgress?.('Loading image…');
  const bitmap = await loadBitmap(url);
  const scale = 2;
  const maxSide = 2048;
  const finalScale = Math.min(scale, maxSide / Math.max(bitmap.width, bitmap.height));

  onProgress?.('Resampling ×2…');
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * finalScale);
  canvas.height = Math.round(bitmap.height * finalScale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  onProgress?.('Sharpening details…');
  sharpen(ctx, canvas.width, canvas.height, 0.32);

  // WebP keeps the data URL small enough to persist in the local gallery.
  return canvas.toDataURL('image/webp', 0.92);
}

/** 3×3 unsharp-mask convolution mixed with the original at `amount`. */
function sharpen(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number): void {
  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const s = src.data;
  const d = dst.data;
  // Sharpen kernel (center 5, edges -1) blended with identity by `amount`.
  const center = 1 + 4 * amount;
  const side = -amount;

  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const i = (row + x) * 4;
      const iL = x > 0 ? i - 4 : i;
      const iR = x < w - 1 ? i + 4 : i;
      const iU = y > 0 ? i - w * 4 : i;
      const iD = y < h - 1 ? i + w * 4 : i;
      for (let c = 0; c < 3; c++) {
        const v = s[i + c] * center + (s[iL + c] + s[iR + c] + s[iU + c] + s[iD + c]) * side;
        d[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
      d[i + 3] = s[i + 3];
    }
  }
  ctx.putImageData(dst, 0, 0);
}
