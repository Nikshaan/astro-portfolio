import type { APIRoute } from "astro";
import { LASTFM_API_KEY, LASTFM_USERNAME } from "astro:env/server";
import {
  getTimeline,
  istDayEndSec,
  peekTimeline,
  rollingWeeks,
  topArtists,
  weeklyPlayMatrix,
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

const SERVER_CACHE_MS = 5 * 60 * 1000;
const TARGET_WEEKS = 52;
const TOP_N = 10;

let cache: { data: RadialHeatmapResult; timestamp: number } | null = null;

const CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
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

function buildResult(timeline: Timeline, anchorSec: number): RadialHeatmapResult {
  const weeks = rollingWeeks(anchorSec, TARGET_WEEKS);
  const rankingStart = weeks[0]?.from ?? anchorSec;
  const artists = topArtists(timeline, rankingStart, TOP_N);
  const matrix = weeklyPlayMatrix(timeline, weeks, artists);

  return {
    weeks,
    artists: artists.map((a, i) => ({ name: a.name, plays: matrix[i] })),
  };
}

export const GET: APIRoute = async () => {
  if (!LASTFM_API_KEY || !LASTFM_USERNAME) {
    return jsonResponse(
      { error: "Last.fm credentials not configured" },
      500,
      "ERROR",
    );
  }

  const anchorSec = istDayEndSec(Date.now());
  const now = Date.now();
  const cacheAge = cache ? now - cache.timestamp : Number.POSITIVE_INFINITY;

  if (cache && cacheAge < SERVER_CACHE_MS) {
    return jsonResponse(cache.data, 200, "HIT");
  }

  try {
    const timeline = await getTimeline(LASTFM_USERNAME, LASTFM_API_KEY, anchorSec);
    const data = buildResult(timeline, anchorSec);
    cache = { data, timestamp: Date.now() };
    return jsonResponse(data, 200, "FRESH");
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
