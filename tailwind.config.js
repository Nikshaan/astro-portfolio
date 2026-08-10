/** @type {import('tailwindcss').Config} */
module.exports = {
  // Dark mode is configured via @custom-variant in src/styles/global.css
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "DM Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Consolas",
          "Monaco",
          "Courier New",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
