import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { APP, externalPath } from './scripts/external-path.mjs'

/**
 * The build has four targets and none of them is a normal web app.
 *
 * Two SURFACES — the living document (`index.html`) and the standalone daily
 * brief (`brief.html`) — each built twice: a browser bundle that gets INLINED
 * into the published Artifact, and a prerender bundle that renders the same
 * components to HTML on node at publish time, so a page has a first paint and
 * survives with JS off.
 *
 * Inlined means: no code splitting, no hashed filenames, no asset URLs. A
 * strict CSP blocks every external request, and `Artifact` publishes exactly
 * one file, so anything that isn't in the bundle simply doesn't exist.
 *
 * The two surfaces share every component; only the root differs. `BRIEF=1`
 * selects which one this build is for. The dev server needs no such flag —
 * both HTML files are served, so `/` is the document and `/brief.html` is the
 * brief, side by side against the same external directory.
 *
 * `DOC=<name>` points `@external` at that document's own directory, which is
 * what makes `npm run dev` a live view of a real document rather than of a
 * fixture. Unset, it resolves to the reference set in `src/__external/`.
 *
 * One external directory is selected at a time, and a directory holds one
 * document — so `DOC=<name>` serves its document at `/` and its Today
 * fragment at `/brief.html`, while `DOC=brief` serves the standalone brief at
 * `/brief.html` and has no `/` to serve.
 */
const BRIEF = !!process.env.BRIEF
const EXTERNAL = externalPath()

/**
 * A vendored bundle is rendered for documents with no cards of their own, so it
 * must carry none itself. `vendor.mjs` sets this; nothing else does.
 */
const NEUTRAL_CARDS = !!process.env.NEUTRAL_CARDS

/**
 * Editing a project's data has to show up in the browser, and by default it
 * does not: Vite caches the transformed module for an imported `.json`, and a
 * content change to one does not invalidate it. Without this, `npm run dev`
 * silently serves the data the server started with — which is the one failure
 * that would make live editing untrustworthy rather than merely slow.
 */
function reloadOnExternalChange(external: string) {
  return {
    name: 'external-reload',
    configureServer(server: import('vite').ViteDevServer) {
      server.watcher.add(external)
      server.watcher.on('change', (file) => {
        if (!file.startsWith(external)) return
        for (const mod of server.environments.client.moduleGraph.getModulesByFile(file) ?? []) {
          server.environments.client.moduleGraph.invalidateModule(mod)
        }
        server.hot.send({ type: 'full-reload' })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), reloadOnExternalChange(EXTERNAL)],
  resolve: {
    alias: {
      // Most specific first — vite matches aliases in declaration order.
      ...(NEUTRAL_CARDS ? { '@external/cards.tsx': `${APP}/src/cards-empty.tsx` } : {}),
      '@app': `${APP}/src`,
      '@external': EXTERNAL,
    },
  },
  server: {
    // A real document's external directory lives outside the app root, so the
    // dev server has to be told it may read there.
    fs: { allow: [APP, EXTERNAL] },
  },
  ssr: {
    // Vite externalizes dependencies in an SSR build by default, which would
    // leave the vendored prerender bundle needing `react`, `react-dom/server`
    // and `zod` on disk at publish time. The refresh loop runs in a cloud
    // routine that clones fresh with no node_modules, so everything is bundled
    // in and the emitted file stands alone on bare node.
    noExternal: true,
  },
  build: {
    outDir: BRIEF ? 'dist-brief' : 'dist',
    emptyOutDir: true,
    // Inline everything small; anything larger must be an explicit data: URI
    // in the data files, never a separate request.
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    modulePreload: false,
    // One file in, one file out — there is nowhere for a second chunk to be
    // served from. `codeSplitting` is what Vite 8's own deprecation notice
    // points at in place of `inlineDynamicImports`, but it is missing from
    // BuildEnvironmentOptions in 8.2.1, so it goes in through a spread rather
    // than as a property TypeScript would reject. `assemble.mjs` does not take
    // this on trust — it asserts the build produced exactly one JS and one CSS.
    ...({ codeSplitting: false } as object),
    rollupOptions: {
      input: BRIEF ? 'brief.html' : 'index.html',
      output: {
        entryFileNames: 'app.js',
        assetFileNames: 'app[extname]',
      },
    },
  },
})
