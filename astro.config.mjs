import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import { BLOG_ARCHIVE_ENABLED, MIN_POSTS_TO_INDEX_TAG } from "./src/lib/blogArchive.ts";
import { tagSlug } from "./src/utils/tagSlug.ts";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

function publishedFrontmatters(
  dir = fileURLToPath(new URL("./src/content/blog/", import.meta.url)),
) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true })
    .map(String)
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => {
      const source = readFileSync(join(dir, file), "utf8");
      return {
        slug: file.replace(/\.mdx?$/, "").replace(/\\/g, "/"),
        frontmatter: source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "",
      };
    })
    .filter(({ frontmatter }) => !/^draft:\s*true\s*$/m.test(frontmatter));
}

function dateIn(frontmatter, key) {
  const raw = frontmatter.match(new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]+)`, "m"))?.[1];
  const date = raw ? new Date(raw.trim()) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function tagsIn(frontmatter) {
  const block = frontmatter.match(/^tags:\s*\r?\n((?:[ \t]+-.*\r?\n?)*)/m)?.[1] ?? "";
  return block
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*-\s*/, "").replace(/^["']|["']$/g, "").trim())
    .filter(Boolean);
}

const posts = publishedFrontmatters();
const blogIsLive = posts.length > 0;

const tagPostCounts = new Map();
const postLastmod = new Map();
for (const { slug, frontmatter } of posts) {
  for (const tag of new Set(tagsIn(frontmatter).map(tagSlug))) {
    tagPostCounts.set(tag, (tagPostCounts.get(tag) ?? 0) + 1);
  }
  const lastmod = dateIn(frontmatter, "updatedDate") ?? dateIn(frontmatter, "pubDate");
  if (lastmod) postLastmod.set(`/blog/${slug}`, lastmod.toISOString());
}

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

function keepTableWordsWhole() {
  const hyphenated = /\S*\w[-\u2010\u2011]\w\S*/g;
  const wrapText = (node) => {
    const parts = [];
    let last = 0;
    for (const match of node.value.matchAll(hyphenated)) {
      if (match.index > last) parts.push({ type: "text", value: node.value.slice(last, match.index) });
      parts.push({
        type: "element",
        tagName: "span",
        properties: { className: ["nowrap"] },
        children: [{ type: "text", value: match[0] }],
      });
      last = match.index + match[0].length;
    }
    if (!parts.length) return [node];
    if (last < node.value.length) parts.push({ type: "text", value: node.value.slice(last) });
    return parts;
  };
  const walk = (node, inCell) => {
    if (!node || !Array.isArray(node.children)) return;
    const cell = inCell || (node.type === "element" && (node.tagName === "td" || node.tagName === "th"));
    if (node.type === "element" && node.tagName === "code") return;
    node.children = node.children.flatMap((child) => {
      if (cell && child.type === "text") return wrapText(child);
      walk(child, cell);
      return [child];
    });
  };
  return (tree) => walk(tree, false);
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
    rehypePlugins: [openExternalLinks, keepTableWordsWhole],
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
        const tag = path.match(/^\/blog\/tags\/([^/]+)$/)?.[1];
        if (tag && (tagPostCounts.get(tag) ?? 0) < MIN_POSTS_TO_INDEX_TAG) return false;
        return blogIsLive || !path.startsWith("/blog");
      },
      serialize: (item) => {
        const path = new URL(item.url).pathname.replace(/\/$/, "");
        const lastmod = postLastmod.get(path);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
    mdx(),
  ],
  adapter: vercel({ maxDuration: 30 }),
});
