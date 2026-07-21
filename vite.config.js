import { defineConfig } from 'vite';

// One self-contained IIFE at server/public/embed.js — no CSS file, styles live in the shadow root.
export default defineConfig({
  esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  build: {
    outDir: 'server/public',
    emptyOutDir: false,
    lib: { entry: 'widget/index.jsx', formats: ['iife'], name: 'AIStylistWidget', fileName: () => 'embed.js' },
  },
});
