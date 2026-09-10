import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, '.', '');
  // Always stringify (never `undefined`) so `process.env.X` is a safe literal in the bundle.
  const geminiKey = JSON.stringify(env.GEMINI_API_KEY ?? env.API_KEY ?? '');

  return {
    // Relative asset URLs for production builds, so `dist/` also works when it is
    // served from a sub-path (GitHub Pages, /preview/…, file://). With the default
    // absolute base every asset 404s there and the page renders blank.
    // Dev keeps '/' because Vite's module graph and HMR expect an absolute base.
    base: command === 'build' ? './' : '/',
    server: {
      port: 3000,
      // Fail loudly instead of silently moving to 3001 (which breaks the preview proxy
      // and looks exactly like "the page never loads").
      strictPort: true,
      host: '0.0.0.0',
      // Required so the platform's live-preview proxy host is accepted.
      allowedHosts: true,
    },
    preview: {
      port: 3000,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: true,
    },
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.API_KEY': geminiKey,
      'process.env.GEMINI_API_KEY': geminiKey,
    },
    optimizeDeps: {
      // Pre-declare every dependency in the graph (including the lazily imported
      // Gemini SDK). Without this, Vite discovers them on first navigation, re-runs
      // the optimizer and swaps the dep hash under the browser's feet — which in a
      // proxied/iframe preview surfaces as a blank page or a reload loop.
      include: [
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/client',
        '@google/genai',
      ],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          // Keep the heavy, optional Gemini SDK in its own chunk: users on the free
          // engine never download it, and a failure to fetch it can't break the boot.
          manualChunks: (id) => (id.includes('@google/genai') ? 'gemini-sdk' : undefined),
        },
      },
    },
  };
});
