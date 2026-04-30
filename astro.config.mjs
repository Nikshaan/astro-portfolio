import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://nikshaan.dev',
  output: 'static',
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  integrations: [
    react(),
    sitemap(),
  ],
  adapter: vercel(),
});