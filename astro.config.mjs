import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://nikshaan.vercel.app',
  output: 'server',

  trailingSlash: 'ignore',

  build: {
    assets: '_astro',
    inlineStylesheets: 'always',
    format: 'directory',
  },

  vite: {
    plugins: [tailwindcss()],
    build: {
      cssCodeSplit: true,
      minify: 'esbuild',
      cssMinify: 'esbuild',
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'framer-motion', 'chart.js', 'react-chartjs-2', 'clsx', 'tailwind-merge'],
      exclude: ['@fancyapps/ui']
    },
    server: {
      preTransformRequests: true,
    }
  },

  integrations: [
    icon({ include: { lucide: ['pin'] } }),
    react(),
    sitemap()
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