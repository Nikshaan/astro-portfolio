import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://nikshaan.dev",
  output: "static",
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: false,
    },
  },
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
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "framer-motion",
        "lucide-react",
        "clsx",
        "tailwind-merge",
        "d3-geo",
        "topojson-client",
        "@fancyapps/ui",
      ],
    },
  },
  integrations: [react(), sitemap(), mdx()],
  adapter: vercel({ maxDuration: 30 }),
});
