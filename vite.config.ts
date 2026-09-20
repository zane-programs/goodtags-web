import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'
import { mediaHandler } from './server/media.mjs'
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'goodtags-media',
      configureServer(server) {
        server.middlewares.use('/media', (req, res) => {
          void mediaHandler(req, res)
        })
      },
      configurePreviewServer(server) {
        server.middlewares.use('/media', (req, res) => {
          void mediaHandler(req, res)
        })
      },
    },
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.png'],
      manifest: {
        id: '/',
        name: 'goodtags',
        short_name: 'goodtags',
        description: 'Barbershop tags, sheet music, and learning tracks.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#d9e3f8',
        theme_color: '#265ea7',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          { name: 'Search tags', url: '/search' },
          { name: 'Favorites', url: '/favorites' },
        ],
      },
      workbox: {
        clientsClaim: true,
        globPatterns: ['**/*.{js,mjs,css,html,png,ttf,mp3,wasm,sqlite,json}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/media/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === '/media',
            handler: 'CacheFirst',
            options: {
              cacheName: 'goodtags-media-v1',
              cacheableResponse: { statuses: [200] },
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 90,
                purgeOnQuotaError: true,
              },
              rangeRequests: true,
            },
          },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./web', import.meta.url)) } },
  test: {
    include: ['web/**/*.test.{ts,tsx}', 'server/**/*.test.mjs'],
    environment: 'jsdom',
    setupFiles: ['./web/test/setup.ts'],
  },
})
