import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // Phaser in its own chunk: it is ~1.2 MB on its own and changes rarely (better caching)
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500, rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } } },
  test: { environment: 'node' },
});
