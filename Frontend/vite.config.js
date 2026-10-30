import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      manifest: {
        id: '/',
        name: 'Faces System',
        short_name: 'Faces',
        description: 'Sistema de gestão do salão Faces.',
        lang: 'pt-PT',
        start_url: '/dashboard',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone'],
        theme_color: '#6D35C8',
        background_color: '#F7F7F9',
        categories: ['business', 'productivity'],
        prefer_related_applications: false,
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            url: '/dashboard',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Novo atendimento',
            short_name: 'Atendimento',
            url: '/novoAtendimento',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Clientes',
            short_name: 'Clientes',
            url: '/clientes',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        icons: [
          {
            src: '/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api(?:\/|$)/],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
