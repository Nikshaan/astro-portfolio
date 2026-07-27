import type { APIRoute } from "astro";
import {
  getTimeline,
  peekTimeline,
  rollingWeeks,
  topArtists,
  weeklyPlayMatrix,
  ROLLING_DAYS,
  SECONDS_PER_DAY,
  type HeatmapWeek,
  type Timeline,
} from "../../lib/lastfmTimeline";

export const prerender = false;

export type RadialHeatmapWeek = HeatmapWeek;

export interface RadialHeatmapArtist {
  name: string;
  plays: number[];
}

export interface RadialHeatmapResult {
  weeks: RadialHeatmapWeek[];
  artists: RadialHeatmapArtist[];
}

const SERVER_CACHE_MS = 90 * 1000;
const MIN_FORCE_INTERVAL_MS = 5 * 60 * 1000;
const ANCHOR_MATCH_SEC = 180;
const TARGET_WEEKS = 52;
const TOP_N = 10;

let cache: {
  anchorSec: number;
  data: RadialHeatmapResult;
  timestamp: number;
} | null = null;

const CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
} as const;

const jsonResponse = (
  data: unknown,
  status: number,
  cacheStatus: string,
): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CACHE_HEADERS, "X-Cache-Status": cacheStatus },
  });

function resolvedAnchorSec(
  serverSec: number,
  clientParam: string | null,
): number {
  if (clientParam == null || clientParam === "") return serverSec;
  const v = parseInt(clientParam, 10);
  if (!Number.isFinite(v) || v <= 0) return serverSec;
  if (Math.abs(serverSec - v) > 900) return serverSec;
  return v;
}

function buildResult(
  timeline: Timeline,
  anchorSec: number,
): RadialHeatmapResult {
  const weeks = rollingWeeks(anchorSec, TARGET_WEEKS);
  const yearStart = anchorSec - ROLLING_DAYS * SECONDS_PER_DAY;
  const artists = topArtists(timeline, yearStart, TOP_N);
  const matrix = weeklyPlayMatrix(timeline, weeks, artists);

  return {
    weeks,
    artists: artists.map((a, i) => ({ name: a.name, plays: matrix[i] })),
  };
}

export const GET: APIRoute = async ({ request }) => {
  const apiKey = (import.meta.env.LASTFM_API_KEY ||
    import.meta.env.PUBLIC_LASTFM_API_KEY) as string;
  const username = (import.meta.env.LASTFM_USERNAME ||
    import.meta.env.PUBLIC_LASTFM_USERNAME) as string;

  if (!apiKey || !username) {
    return jsonResponse(
      { error: "Last.fm credentials not configured" },
      500,
      "ERROR",
    );
  }

  const serverSec = Math.floor(Date.now() / 1000);
  const url = new URL(request.url);
  const anchorSec = resolvedAnchorSec(serverSec, url.searchParams.get("until"));
  const now = Date.now();
  const cacheAge = cache ? now - cache.timestamp : Number.POSITIVE_INFINITY;

  const forceRefresh =
    url.searchParams.get("force") === "1" && cacheAge >= MIN_FORCE_INTERVAL_MS;

  if (
    !forceRefresh &&
    cache &&
    cacheAge < SERVER_CACHE_MS &&
    Math.abs(cache.anchorSec - anchorSec) <= ANCHOR_MATCH_SEC
  ) {
    return jsonResponse(cache.data, 200, "HIT");
  }

  try {
    const timeline = await getTimeline(username, apiKey, anchorSec, {
      force: forceRefresh,
    });
    const data = buildResult(timeline, anchorSec);
    cache = { anchorSec, data, timestamp: Date.now() };
    return jsonResponse(data, 200, forceRefresh ? "MISS" : "FRESH");
  } catch (error) {
    if (cache) return jsonResponse(cache.data, 200, "STALE");

    const fallback = peekTimeline();
    if (fallback) {
      return jsonResponse(buildResult(fallback, anchorSec), 200, "STALE");
    }

    return jsonResponse(
      {
        error: "Failed to fetch radial heatmap",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
      "ERROR",
    );
  }
};
