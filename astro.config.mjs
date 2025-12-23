import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://nikshaan.vercel.app', // Update this with your actual Vercel domain

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
      chunkSizeWarningLimit: 1000,
      cssMinify: 'esbuild',
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (!id.includes('node_modules')) return undefined;
            if (
              id.includes('/react') ||
              id.includes('/react-dom') ||
              id.includes('/scheduler') ||
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')
            ) {
              return 'vendor-react';
            }

            if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'vendor-chartjs';
            }

            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }
            if (id.includes('@fancyapps')) {
              return 'vendor-fancyapps';
            }

            if (id.includes('lenis')) {
              return 'vendor-lenis';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }

            if (id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'vendor-utils';
            }
            if (id.includes('astro-tooltips') || id.includes('tippy') || id.includes('popper')) {
              return undefined;
            }

            return undefined;
          },
          chunkFileNames: (chunkInfo) => {
            return '_astro/[name].[hash].js';
          },
          assetFileNames: '_astro/[name].[hash][extname]',
          experimentalMinChunkSize: 10000,
          compact: true,
        }
      }
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
    webAnalytics: { enabled: true },
    speedInsights: { enabled: true },
    imageService: true,
  })
});