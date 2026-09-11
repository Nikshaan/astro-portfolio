import type { APIRoute } from "astro";
import { LASTFM_API_KEY, LASTFM_USERNAME } from "astro:env/server";
import {
  calendarWeeks,
  getTimeline,
  istDayEndSec,
  peekTimeline,
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

const SERVER_CACHE_MS = 15 * 60 * 1000;
const TARGET_WEEKS = 52;
const TOP_N = 10;

let cache: { data: RadialHeatmapResult; timestamp: number } | null = null;

const CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=120, s-maxage=900, stale-while-revalidate=86400",
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

function buildResult(timeline: Timeline, nowMs: number): RadialHeatmapResult {
  const weeks = calendarWeeks(nowMs, TARGET_WEEKS);
  const rankingStart = weeks[0]?.from ?? Math.floor(nowMs / 1000);
  const artists = topArtists(timeline, rankingStart, TOP_N);
  const matrix = weeklyPlayMatrix(timeline, weeks, artists);

  return {
    weeks,
    artists: artists.map((a, i) => ({ name: a.name, plays: matrix[i] })),
  };
}

let pendingRequest: Promise<RadialHeatmapResult> | null = null;

export const GET: APIRoute = async () => {
  if (!LASTFM_API_KEY || !LASTFM_USERNAME) {
    return jsonResponse(
      { error: "Last.fm credentials not configured" },
      500,
      "ERROR",
    );
  }

  const now = Date.now();
  const anchorSec = istDayEndSec(now);
  const cacheAge = cache ? now - cache.timestamp : Number.POSITIVE_INFINITY;

  if (cache && cacheAge < SERVER_CACHE_MS) {
    return jsonResponse(cache.data, 200, "HIT");
  }

  if (pendingRequest) {
    try {
      const data = await pendingRequest;
      return jsonResponse(data, 200, "DEDUPED");
    } catch {}
  }

  const execute = async (): Promise<RadialHeatmapResult> => {
    const timeline = await getTimeline(
      LASTFM_USERNAME,
      LASTFM_API_KEY,
      anchorSec,
    );
    const data = buildResult(timeline, now);
    cache = { data, timestamp: Date.now() };
    return data;
  };

  const run = execute();
  pendingRequest = run;
  void run.catch(() => {}).finally(() => {
    if (pendingRequest === run) pendingRequest = null;
  });

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeline fetch timeout")), 3500),
    );
    const data = await Promise.race([run, timeoutPromise]);
    return jsonResponse(data, 200, "FRESH");
  } catch (error) {
    if (cache) return jsonResponse(cache.data, 200, "STALE");

    const fallback = peekTimeline();
    if (fallback) {
      const data = buildResult(fallback, now);
      cache = { data, timestamp: Date.now() };
      return jsonResponse(data, 200, "STALE");
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
