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
  // Nothing in public/ belongs in the widget bundle (mascot images are
  // fetched over the network from `assetBase`, not bundled), and leaving
  // this on would make Vite refuse the outDir below for overlapping with
  // the public dir.
  publicDir: false,
  build: {
    // Emitted straight into the SPA's public/ so `/widget.js` resolves on
    // the app's own origin — which is exactly what the embed snippet the
    // portal hands a client points at (PortalEmbedPage.tsx). Previously
    // this built to dist-widget/, which nothing ever served, so the
    // copy-paste snippet 404'd in dev and only worked in production if
    // whoever deployed remembered to move the file by hand. public/ is
    // copied verbatim into dist/ by the SPA build, so one `npm run build`
    // now produces a dist/ that serves both the app and the widget.
    outDir: 'public',
    // public/ holds real committed source assets (favicon, mascot art) —
    // wiping it on every widget build would delete them.
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, 'src/widget-embed.tsx'),
      name: 'SiteConciergeWidget',
      formats: ['iife'],
      fileName: () => 'widget.js',
    },
  },
})
