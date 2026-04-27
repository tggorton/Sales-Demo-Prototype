import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
