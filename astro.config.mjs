import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://Nikshaan.github.io',
  base: '/astro-portfolio',
  vite: {
    plugins: [tailwindcss()],
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: [
            'console.log',
            'console.error',
            'console.warn',
            'console.info',
            'React.createElement'
          ],
          passes: 2,
          dead_code: true
        },
        mangle: {
          safari10: true
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['react', 'react-dom'],
            'fancyapps': ['@fancyapps/ui']
          }
        }
      }
    }
  },

  integrations: [
    icon({ include: { lucide: ['pin'] } }),
    react()
  ]
});
