import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://nikshaan.vercel.app',
  output: 'static',
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  integrations: [
    react(),
  ],
  adapter: vercel(),
});