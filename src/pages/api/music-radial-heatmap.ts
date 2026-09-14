import type { APIRoute } from "astro";
import { LASTFM_API_KEY, LASTFM_USERNAME } from "astro:env/server";
import { jsonResponse, keepAlive } from "../../lib/apiResponse";
import {
  calendarWeeks,
  effectiveFetchedAt,
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

let cache: {
  data: RadialHeatmapResult;
  timestamp: number;
  fetchedAt: number;
} | null = null;

function respond(
  data: unknown,
  cacheStatus: string,
  fetchedAt: number,
  status = 200,
) {
  const cdn =
    cacheStatus === "STALE" || cacheStatus === "FALLBACK" ? "stale" : "default";
  return jsonResponse(data, { status, cacheStatus, fetchedAt, cdn });
}

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
    return respond(
      { error: "Last.fm credentials not configured" },
      "ERROR",
      0,
      500,
    );
  }

  const now = Date.now();
  const anchorSec = istDayEndSec(now);
  const cacheAge = cache ? now - cache.timestamp : Number.POSITIVE_INFINITY;

  if (cache && cacheAge < SERVER_CACHE_MS) {
    return respond(cache.data, "HIT", cache.fetchedAt);
  }

  if (pendingRequest) {
    try {
      const data = await pendingRequest;
      return respond(data, "DEDUPED", cache?.fetchedAt ?? Date.now());
    } catch {}
  }

  const execute = async (): Promise<RadialHeatmapResult> => {
    const timeline = await getTimeline(
      LASTFM_USERNAME,
      LASTFM_API_KEY,
      anchorSec,
    );
    const data = buildResult(timeline, now);
    cache = {
      data,
      timestamp: Date.now(),
      fetchedAt: effectiveFetchedAt(timeline),
    };
    return data;
  };

  const run = execute();
  pendingRequest = run;
  keepAlive(run);
  void run.catch(() => {}).finally(() => {
    if (pendingRequest === run) pendingRequest = null;
  });

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeline fetch timeout")), 3500),
    );
    const data = await Promise.race([run, timeoutPromise]);
    return respond(data, "FRESH", cache?.fetchedAt ?? Date.now());
  } catch (error) {
    if (cache && cache.timestamp > 0) {
      return respond(cache.data, "STALE", cache.fetchedAt);
    }

    const fallback = peekTimeline();
    if (fallback) {
      const data = buildResult(fallback, now);
      const fetchedAt = effectiveFetchedAt(fallback);
      if (!cache || cache.timestamp === 0) {
        cache = { data, timestamp: 0, fetchedAt };
      }
      return respond(data, "STALE", fetchedAt);
    }

    return respond(
      {
        error: "Failed to fetch radial heatmap",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      "ERROR",
      0,
      500,
    );
  }
};
