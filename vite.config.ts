/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Phase 7a — Vitest unit tests for pure-function protected behaviors.
    // Tests live in `tests/unit/` rooted at the project root so the source
    // tree stays clean; co-located *.test.ts files would also be picked up
    // if we ever want them. `node` environment by default — pure-function
    // tests don't need DOM. Add `environment: 'jsdom'` (and the jsdom dep)
    // when component or hook tests land in 7b.
    include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
  build: {
    // Split heavy third-party libraries into their own long-lived chunks so
    // that (a) the browser can download them in parallel with the app code,
    // (b) they get cached across deploys when only app code changes, and
    // (c) the main app chunk shrinks dramatically. The previous single
    // `index-*.js` was 540KB (165KB gzip) because MUI + Emotion + React
    // were all bundled together with our component tree; pulling them out
    // halves the chunk that has to re-download every time we ship.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-mui'
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler'))
            return 'vendor-react'
          return 'vendor'
        },
      },
    },
    // Each tier's analysis JSON gets emitted as its own chunk via dynamic
    // import; tier2 is unavoidably large (~1.8MB) because the upstream JSON
    // is ~3.6MB. Silencing the warning at 2MB keeps the build log clean
    // without hiding genuinely surprising chunk-size regressions.
    chunkSizeWarningLimit: 2000,
  },
})
