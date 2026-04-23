import { defineConfig } from 'astro/config';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import partytown from '@astrojs/partytown';

export default defineConfig({
  site: 'https://nikshaan.vercel.app',
  output: 'server',
  trailingSlash: 'ignore',

  build: {
    assets: '_astro',
    inlineStylesheets: 'auto',
    format: 'directory',
  },

  vite: {
    plugins: [
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /\/_vercel\/image/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'vercel-images',
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
            {
              urlPattern: /\/api\/(github-contributions|music-stats|gallery\.json)/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'api-cache',
                expiration: { maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              urlPattern: /\/_astro\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'static-assets',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
          globPatterns: ['**/*.{html,css,js,avif,webp,svg,woff2}'],
        },
      })
    ],
    build: {
      cssCodeSplit: true,
      minify: 'esbuild',
      cssMinify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'framer': ['framer-motion'],
            'chart': ['chart.js', 'react-chartjs-2'],
          }
        }
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'framer-motion', 'chart.js', 'react-chartjs-2', 'clsx', 'tailwind-merge'],
      exclude: ['@fancyapps/ui']
    },
  },

  integrations: [
    icon({ include: { lucide: ['pin'] } }),
    react(),
    sitemap(),
    partytown({
      config: {
        forward: ['dataLayer.push'],
      },
    }),
  ],

  compressHTML: true,

  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport'
  },

  adapter: vercel({
    imageService: true,
  })
});