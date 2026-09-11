import type { APIRoute } from "astro";
import { GH_TOKEN } from "astro:env/server";

export const prerender = false;

const REPO = "Nikshaan/llm-from-scratch";
const CACHE_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT = 8000;

let cachedStars: number | null = null;
let lastFetchTime = 0;
let pendingRequest: Promise<number> | null = null;

async function fetchStars(): Promise<number> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (GH_TOKEN) headers.Authorization = `Bearer ${GH_TOKEN}`;

  const response = await fetch(`https://api.github.com/repos/${REPO}`, {
    cache: "no-store",
    signal: controller.signal,
    headers,
  });

  clearTimeout(timeoutId);

  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);

  const data = (await response.json()) as { stargazers_count?: number };
  const stars = data.stargazers_count ?? 0;
  cachedStars = stars;
  lastFetchTime = Date.now();
  return stars;
}

function jsonResponse(stars: number, cacheStatus: string) {
  return new Response(JSON.stringify({ stars }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control":
        "public, max-age=120, s-maxage=1800, stale-while-revalidate=86400",
      "X-Cache-Status": cacheStatus,
    },
  });
}

export const GET: APIRoute = async () => {
  const now = Date.now();
  if (cachedStars !== null && now - lastFetchTime < CACHE_MS) {
    return jsonResponse(cachedStars, "HIT");
  }

  if (pendingRequest) {
    try {
      const stars = await pendingRequest;
      return jsonResponse(stars, "DEDUPED");
    } catch {}
  }

  const run = fetchStars();
  pendingRequest = run;
  void run.catch(() => {}).finally(() => {
    if (pendingRequest === run) pendingRequest = null;
  });

  try {
    const stars = await run;
    return jsonResponse(stars, "MISS");
  } catch {
    if (cachedStars !== null) return jsonResponse(cachedStars, "STALE");
    return new Response(JSON.stringify({ error: "Failed to fetch stars" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
};
