/** @type {import('tailwindcss').Config} */
module.exports = {
  // This tells Tailwind to apply 'light:' prefixed classes
  // when 'data-theme="light"' is present on a parent.
  darkMode: ['selector', '[data-theme="light"]'],

  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'
  ],

  theme: {
    extend: {
      colors: {
        // Add the custom color for the light theme card
        'theme-light-card': '#e0f2fe', // light blue for cards
        'theme-light-bg': '#ffffff', // white background
        'theme-light-text': '#000000', // black text
        'theme-light-border': '#000000', // black borders
        'theme-light-hover': '#3b82f6', // blue-500 for hover states
      },
    },
  },
  plugins: [],
}
