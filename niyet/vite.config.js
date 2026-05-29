import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Block 15: installable + offline. The plugin owns service-worker generation
    // and precache-manifest accuracy (Workbox); we keep public/manifest.json as
    // the source of truth, so manifest:false. SW registration is auto-injected.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // SPA fallback: any uncached navigation resolves to the cached shell so
        // the app launches offline even on a hard refresh of a deep route.
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // App shell + static assets, same origin → cache-first.
            urlPattern: ({ url }) => url.origin === self.location.origin,
            handler: 'CacheFirst',
            options: {
              cacheName: 'niyet-shell-v1',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            // Block 16 hook point: Supabase reads → network-first with a short
            // timeout so offline never hangs. Matches nothing until Block 16
            // ships; the localStorage fallback lives in the app layer (Block 14 /
            // src/lib/pwa.js networkFirstWithLocalStorageFallback), not the SW.
            urlPattern: ({ url }) => url.hostname.includes('supabase.co'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'niyet-supabase-v1',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 },
            },
          },
        ],
      },
    }),
  ],
})
