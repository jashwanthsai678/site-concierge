import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Separate build target from vite.config.ts's SPA build — produces a single
// self-contained IIFE (dist-widget/widget.js) a client pastes onto their
// own site via <script src="...widget.js">. A plain <script> tag has no
// module resolution, so this can't be an ES module bundle; IIFE runs
// standalone with zero assumptions about the host page.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // Library-mode builds skip the SPA build's automatic env replacement —
  // some dependency (react-dom's dev-mode checks) references bare
  // `process.env.NODE_ENV`, which is a Node global with no browser
  // equivalent; without this the whole IIFE throws immediately on load
  // with "process is not defined" before ever reaching app code.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist-widget',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, 'src/widget-embed.tsx'),
      name: 'SiteConciergeWidget',
      formats: ['iife'],
      fileName: () => 'widget.js',
    },
  },
})
