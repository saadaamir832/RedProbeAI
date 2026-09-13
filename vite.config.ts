import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.VITE_BASE || (repoName ? `/${repoName}/` : './');

// https://vite.dev/config/
export default defineConfig({
  // For GitHub Pages, assets need to be deployed under the repo subpath.
  // If the app is uploaded manually or built outside CI, a relative base keeps
  // the generated files working on static hosting without extra config.
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
