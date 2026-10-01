import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// True when src/content/blog holds at least one post without `draft: true`.
// Until then the /blog pages are empty listings: keep them out of the sitemap
// (they also render with noindex).
function hasPublishedPosts(
  dir = fileURLToPath(new URL("./src/content/blog/", import.meta.url)),
) {
  if (!existsSync(dir)) return false;
  return readdirSync(dir, { recursive: true }).some((name) => {
    const file = String(name);
    if (!/\.mdx?$/.test(file)) return false;
    const source = readFileSync(join(dir, file), "utf8");
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
    return !/^draft:\s*true\s*$/m.test(frontmatter);
  });
}

const blogIsLive = hasPublishedPosts();

export default defineConfig({
  site: "https://nikshaan.dev",
  output: "static",
  build: {
    // One small stylesheet: inlining it removes the render-blocking request
    // that otherwise delays first paint on slow mobile connections.
    inlineStylesheets: "always",
  },
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
  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        blogIsLive || !new URL(page).pathname.startsWith("/blog"),
    }),
    mdx(),
  ],
  adapter: vercel({ maxDuration: 30 }),
});
