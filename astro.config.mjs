import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://Nikshaan.github.io',
  base: '/astro-portfolio',
  trailingSlash: 'ignore',
  build: {
    assets: '_astro',
    inlineStylesheets: 'always' // Inline critical CSS to prevent render blocking
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssCodeSplit: true, // Split CSS for better caching
      minify: 'esbuild', // Use esbuild - faster than terser
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Aggressive code splitting to minimize unused JS
            if (id.includes('node_modules')) {
              // Keep React core + DOM together (essential)
              if (id.includes('react/') || id.includes('react-dom/') || id.includes('scheduler')) {
                return 'vendor-react';
              }
              // Recharts - lazy loaded ONLY when music section is visible
              if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-')) {
                return 'vendor-recharts';
              }
              // Framer Motion - split per component
              if (id.includes('framer-motion')) {
                // Split motion for different sections
                if (id.includes('MeBentoGrid') || id.includes('ProjectsBentoGrid')) {
                  return 'vendor-framer-bento';
                }
                return 'vendor-framer';
              }
              // Fancybox - lazy loaded on user interaction
              if (id.includes('@fancyapps')) {
                return 'vendor-fancyapps';
              }
              // Lenis - deferred initialization
              if (id.includes('lenis')) {
                return 'vendor-lenis';
              }
              // Keep tooltips in main to avoid errors
              if (id.includes('astro-tooltips') || id.includes('tippy') || id.includes('popper')) {
                return undefined;
              }
            }
          },
          // Optimize chunk naming and size
          chunkFileNames: (chunkInfo) => {
            // Smaller chunks for better caching
            return '_astro/[name].[hash].js';
          },
          assetFileNames: '_astro/[name].[hash][extname]',
          // Ensure optimal chunk size
          experimentalMinChunkSize: 10000
        }
      }
    }
  },

  integrations: [
    icon({ include: { lucide: ['pin'] } }),
    react(),
    sitemap()
  ],

  // Enable compression
  compressHTML: true,

  // Prefetch settings for faster navigation
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport'
  }
});
