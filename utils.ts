/**
 * Small shared helpers for the app layer.
 */

/**
 * Collision-resistant id that also works outside a secure context.
 *
 * `crypto.randomUUID` is only exposed on HTTPS / localhost pages. It used to be
 * called directly, so opening the studio over a plain-HTTP LAN address (or any
 * non-secure deployment) threw `crypto.randomUUID is not a function` on every
 * generate click.
 */
export function uid(): string {
  const c = typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (c && typeof c.randomUUID === 'function') {
    try {
      return c.randomUUID();
    } catch {
      /* fall through to the manual variant below */
    }
  }
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** True when the page is running as an object URL created in this document. */
export function isObjectUrl(url: string | undefined): boolean {
  return typeof url === 'string' && url.startsWith('blob:');
}

/**
 * Releases a display-only object URL once nothing renders it any more.
 * Browsers keep every unreleased blob alive for the whole session.
 */
export function revokeObjectUrl(url: string | undefined): void {
  if (isObjectUrl(url)) {
    try {
      URL.revokeObjectURL(url as string);
    } catch {
      /* ignore */
    }
  }
}
