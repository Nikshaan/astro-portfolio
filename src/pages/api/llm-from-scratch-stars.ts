import type { APIRoute } from "astro";
import { GH_TOKEN } from "astro:env/server";
import { jsonResponse } from "../../lib/apiResponse";

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

function respond(stars: number, cacheStatus: string, fetchedAt: number) {
  const cdn =
    cacheStatus === "STALE" || cacheStatus === "FALLBACK" ? "stale" : "default";
  return jsonResponse({ stars }, { cacheStatus, fetchedAt, cdn });
}

export const GET: APIRoute = async () => {
  const now = Date.now();
  if (cachedStars !== null && now - lastFetchTime < CACHE_MS) {
    return respond(cachedStars, "HIT", lastFetchTime);
  }

  if (pendingRequest) {
    try {
      const stars = await pendingRequest;
      return respond(stars, "DEDUPED", lastFetchTime || Date.now());
    } catch {}
  }

  const run = fetchStars();
  pendingRequest = run;
  void run.catch(() => {}).finally(() => {
    if (pendingRequest === run) pendingRequest = null;
  });

  try {
    const stars = await run;
    return respond(stars, "MISS", lastFetchTime);
  } catch {
    if (cachedStars !== null) return respond(cachedStars, "STALE", lastFetchTime);
    return jsonResponse(
      { error: "Failed to fetch stars" },
      { status: 503, cacheStatus: "ERROR", fetchedAt: 0, cdn: "stale" },
    );
  }
};
