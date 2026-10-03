---
title: "How I Made a React SPA SEO-Friendly on a Static Host"
description: "How I made a client-side React SPA SEO-friendly on a static host: build-time prerendering, JSON-LD, redirects and an auto-publishing CMS, for ~$0."
pubDate: 2026-10-03
tags:
  - SEO
  - React
  - Prerendering
  - CMS
  - System Design
featured: true
featuredOrder: 1
ogImage: /blog/blog-architecture.png
---

*I used an LLM to help refine this post.*

<aside class="post-alert" role="note">
  <p>Built for the previous version of Arya, before the frontend was rebuilt on Next.js for Arya 2.0.</p>
</aside>

At Mentoria, I built [Arya's blog](https://arya.mentoria.com/blog) end to end, including the CMS, public reader, SEO layer and publishing pipeline. The first iteration launched in two days in July 2026, and I spent the following four weeks hardening it to handle a large scale of posts.

The brief was challenging: it needed to be a real `/blog` subfolder on Arya's main domain, rank well on Google, avoid using any third-party CMS, and not introduce any new hosted service. Arya's frontend was a client-rendered React app on a static host, which means that crawlers would see an empty page, and the host wouldn't be able to return a real 301 or 404.

## What a static host can't do

Every SEO basic assumes a server. Since I had a static host, every one needed a workaround:

| SEO needs | The static host gives | What I built instead |
| --- | --- | --- |
| Real HTML for crawlers | An empty page, until JavaScript runs | Every post prerendered to static HTML at build time |
| Per-post titles, descriptions and social cards | One shared head section for every page | Head tags and structured data baked into each page |
| 301 redirects for renamed posts | No per-URL redirects | A slug history and a redirect page for every old URL |
| Real 404s | An empty 200 for anything missing | `noindex` not-found pages for removed posts |
| Fresh content on publish | Nothing changes until a redeploy | A publish-triggered, debounced rebuild |

The obvious alternative was to move the whole frontend to a server-rendered framework like NextJS. Re-platforming the entire app for a blog of a couple of dozen posts would be a massive undertaking, so I kept the stack and solved each gap at build time.

## How it fits together

Everything lives within Arya's existing stack: FastAPI, Postgres, Redis and Celery on the backend, and the React app's own build on the frontend.

<figure>
  <img
    src="/blog/blog-architecture.webp"
    alt="Blog architecture: writer publishes, FastAPI and Postgres, Redis debounce, deploy hook, build and prerender, build outputs, static host, readers and crawlers"
    width="2400"
    height="828"
    loading="lazy"
    decoding="async"
  />
  <figcaption>Publishing a post rebuilds static, crawler-ready pages with no server. New posts flow left to right, and readers flow back along the bottom.</figcaption>
</figure>

The prerender turns a client-side app into pages a crawler can read on the first request.

## The CMS

Writers get a [TipTap](https://tiptap.dev) rich-text editor with image upload, categories, draft and publish states, author permissions, and an SEO helper for each post's metadata.

<figure class="post-figure-shot" style="--shot-width: 1024px">
  <img
    src="/blog/blog-editor.webp"
    alt="The post editor, with the title, slug, and body of a published post open."
    width="1024"
    height="561"
    loading="lazy"
    decoding="async"
  />
  <figcaption>The editor reopens the saved post: title, slug, and body.</figcaption>
</figure>

The key decision was how to store a post. I kept two forms of it:

- **[TipTap](https://tiptap.dev) JSON is the source of truth.** It's structured, so the editor always reopens exactly what was saved.
- **Sanitised HTML is a server-rendered cache.** The backend renders the JSON once, adds heading IDs for the table of contents, and sanitises it against an allowlist (`nh3`), so the reader never renders raw user HTML.

<figure class="post-figure-shot" style="--shot-width: 482px">
  <img
    src="/blog/seo-preview-checks.webp"
    alt="SEO helper showing the search preview and focus-keyphrase checks, all passing, including featured-image alt text."
    width="482"
    height="838"
    loading="lazy"
    decoding="async"
  />
  <figcaption>The SEO helper checks the preview, the keyphrase, and the featured image before publish.</figcaption>
</figure>

## SEO-grade HTML from a client-side app

I wrote a build-time prerender that renders the real React blog pages to static HTML. The page a crawler reads and the page a user sees come from the same components. Each prerendered page carries:

- Its own title, meta description and canonical URL
- Open Graph tags for link previews
- `Article` and `FAQPage` structured data for rich results
- A table of contents built from the heading IDs
- An entry in a generated `sitemap.xml`

<figure class="post-figure-shot" style="--shot-width: 718px">
  <img
    src="/blog/seo-metadata-fields.webp"
    alt="SEO fields for meta title, meta description, focus keyphrase, canonical URL, Open Graph overrides, and an FAQ section."
    width="718"
    height="898"
    loading="lazy"
    decoding="async"
  />
  <figcaption>Each post stores its own title, description, social card, and FAQ block.</figcaption>
</figure>

The hard part is making the static HTML and the live app match exactly, because any difference will make React throw the page away and re-render it. I injected the hashed CSS from Vite's build manifest so pages don't flash unstyled, eagerly loaded blog routes so the server and client trees match, and pinned date formatting to one timezone so the build machine and the reader's browser print the same date.

<figure class="post-figure-shot post-figure-desktop" style="--shot-width: 957px">
  <img
    src="/blog/rich-results-article.webp"
    alt="Google Rich Results Test showing one valid Article item for How to Get More Interview Calls in India."
    width="957"
    height="852"
    loading="lazy"
    decoding="async"
  />
  <figcaption>The prerendered HTML validates as an Article in Google's Rich Results Test, with no public URL required.</figcaption>
</figure>

<figure class="post-figure-shot post-figure-desktop" style="--shot-width: 1024px">
  <img
    src="/blog/search-console-trending.webp"
    alt="Google Search Console trending blog posts, with click growth on Arya blog URLs."
    width="1024"
    height="453"
    loading="lazy"
    decoding="async"
  />
  <figcaption>Search Console, after the pages were live: blog URLs trending up on clicks.</figcaption>
</figure>

## Redirects and 404s without a server

URLs change as a writer renames a post, a post is unpublished, an old link lives in Google's index. On a static host, each of these becomes an empty page that quietly hurts rankings. I moved these decisions into the build:

- **Slug history.** When a post's slug changes, the old one is recorded, and at build time each old URL gets a tiny page that instantly redirects to the new one.
- **Not-found pages that say so.** Unpublished posts get a not-found page marked `noindex`, so they drop out of search instead of lingering.
- **No orphaned posts.** Paginated index pages and per-category archives with previous and next links make every post reachable through links, not just the sitemap.
- **No duplicate pages.** `/blog/page/1` redirects to `/blog`, and drafts never appear in any public listing.

## Publishing without a human

On a static site, publishing makes no change until the blog rebuilds. I wanted "Publish" to mean live, without anyone running a deploy, and without five quick edits triggering five full blog builds:

1. **Publish marks a rebuild as pending** in Redis.
2. **A 45-second debounce window** collects further edits, so a burst of changes becomes one build.
3. **The deploy hook fires**, and the pending flag clears only after it succeeds, so a failed trigger is never lost.
4. **A guaranteed follow-up job** in Celery catches edits made while a build was already running.

The most important decision was to fail open when Redis is unavailable. A redundant build costs a minute. A silently skipped one leaves a published post invisible with nobody noticing. The build itself fetches posts 12 at a time with 30-second timeouts, so it stays fast as the blog grows.

## Trade-offs and what's next

- **Redirect pages aren't true 301s.** They redirect instantly and search engines typically follow them, but a real 301 is the cleaner signal. It was the cost of a static host with no edge layer.
- **Publishing rebuilds the entire blog.** A publish rebuilds the `/blog` route. That's simple and cheap now. As the blog grows, I'd regenerate only the pages that changed.
- **Images go up as uploaded.** Automatic resizing and WebP conversion at upload time is the next performance win.

## Built with

React 18 and Vite with a custom Node prerender, [react-helmet-async](https://github.com/staylor/react-helmet-async) for head tags, [TipTap](https://tiptap.dev) for the editor, and FastAPI, SQLAlchemy, Alembic, Postgres, Redis and Celery on the backend, hosted on Render.
