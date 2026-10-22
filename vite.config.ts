import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['autofvmc-icon.svg'],
      manifest: {
        name: 'AutoFVMC AI Commissioning Console',
        short_name: 'AutoFVMC',
        description: 'Engineering console for HVAC controller commissioning.',
        theme_color: '#111b2b',
        background_color: '#f3f7fa',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/autofvmc-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
})
