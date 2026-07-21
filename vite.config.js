import { defineConfig } from 'vite';

// Two self-contained IIFE bundles from one config — `npm run build` runs it twice.
// Lib mode takes a single entry, so BUILD_ASK picks which one. No CSS files: styles
// are strings in the JS (shadow root for the widget, injected <style> for the page).
const ask = !!process.env.BUILD_ASK;

export default defineConfig({
  esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  build: {
    outDir: 'server/public',
    emptyOutDir: false,
    lib: {
      entry: ask ? 'widget/ask.jsx' : 'widget/index.jsx',
      formats: ['iife'],
      name: ask ? 'AskPal' : 'AIStylistWidget',
      fileName: () => (ask ? 'ask.js' : 'embed.js'),
    },
  },
});
