import { defineConfig } from 'astro/config';
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
    plugins: [tailwindcss()],
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