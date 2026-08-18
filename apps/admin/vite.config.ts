import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

/**
 * 後台是掛在公開站 `/admin` 底下的 SPA（CLAUDE.md §2）——
 * 同一個 SWA app，所以 `base` 必須是 `/admin/`，產物直接進 web 的 `public/admin`。
 *
 * 打包體積計入 SWA Free 的 250MB 上限（與公開站共用），
 * 所以重量級套件（TipTap、dnd-kit）一律 lazy load，見 docs/03 §8.1。
 */
export default defineConfig({
  base: '/admin/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: '../web/public/admin',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // 開發時直接打本機 Function App，避免 CORS
      '/api': { target: 'http://localhost:7071', changeOrigin: true },
    },
  },
});
