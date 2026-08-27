import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://nikshaan.dev",
  output: "static",
  env: {
    schema: {
      GH_TOKEN: envField.string({ context: "server", access: "secret" }),
      GH_USERNAME: envField.string({ context: "server", access: "secret" }),
      LASTFM_API_KEY: envField.string({ context: "server", access: "secret" }),
      LASTFM_USERNAME: envField.string({ context: "server", access: "secret" }),
      SPOTIFY_CLIENT_ID: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      SPOTIFY_CLIENT_SECRET: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["clsx", "tailwind-merge"],
    },
  },
  integrations: [react(), sitemap()],
  adapter: vercel({ maxDuration: 30 }),
});
