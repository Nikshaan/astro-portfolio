import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import { BLOG_ARCHIVE_ENABLED } from "./src/lib/blogArchive.ts";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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

function openExternalLinks() {
  return (tree) => {
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "element" && node.tagName === "a") {
        const href = node.properties?.href;
        if (typeof href === "string" && /^https?:\/\//i.test(href)) {
          node.properties.target = "_blank";
          const rel = new Set(
            String(node.properties.rel || "")
              .split(/\s+/)
              .filter(Boolean),
          );
          rel.add("noopener");
          rel.add("noreferrer");
          node.properties.rel = [...rel].join(" ");
        }
      }
      if (Array.isArray(node.children)) node.children.forEach(walk);
    };
    walk(tree);
  };
}

export default defineConfig({
  site: "https://nikshaan.dev",
  output: "static",
  redirects: {
    "/blog/seo-first-blog-on-a-static-host": {
      status: 308,
      destination: "/blog/react-spa-seo-static-host-prerendering/",
    },
  },
  build: {
    inlineStylesheets: "always",
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  markdown: {
    rehypePlugins: [openExternalLinks],
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
    {
      name: "hide-blog-index",
      hooks: {
        "astro:build:done": ({ dir }) => {
          if (BLOG_ARCHIVE_ENABLED) return;
          const removeIndex = () => {
            const built = fileURLToPath(new URL("./blog/index.html", dir));
            const copied = join(process.cwd(), ".vercel/output/static/blog/index.html");
            for (const file of [built, copied]) {
              if (existsSync(file)) unlinkSync(file);
            }
          };
          removeIndex();
          process.once("beforeExit", removeIndex);
        },
      },
    },
    react(),
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname.replace(/\/$/, "") || "/";
        if (!BLOG_ARCHIVE_ENABLED && path === "/blog") return false;
        return blogIsLive || !path.startsWith("/blog");
      },
    }),
    mdx(),
  ],
  adapter: vercel({ maxDuration: 30 }),
});
