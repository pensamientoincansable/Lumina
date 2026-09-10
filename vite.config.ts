import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Always stringify (never `undefined`) so `process.env.X` is a safe literal in the bundle.
  const geminiKey = JSON.stringify(env.GEMINI_API_KEY ?? env.API_KEY ?? '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Required so the platform's live-preview proxy host is accepted.
      allowedHosts: true,
    },
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.API_KEY': geminiKey,
      'process.env.GEMINI_API_KEY': geminiKey,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
