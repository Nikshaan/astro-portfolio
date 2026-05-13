import type { APIRoute } from "astro";

export const prerender = false;

export interface RadialHeatmapWeek {
  from: number;
  to: number;
}

export interface RadialHeatmapArtist {
  name: string;
  plays: number[];
}

export interface RadialHeatmapResult {
  weeks: RadialHeatmapWeek[];
  artists: RadialHeatmapArtist[];
}

interface WeeklyChartEntry {
  from?: string;
  to?: string;
}

const SERVER_CACHE_MS = 3 * 60 * 1000;
const ANCHOR_MATCH_SEC = 180;
const SECONDS_PER_DAY = 86400;
const ROLLING_DAYS = 365;
const TOP_N = 10;
const WEEK_FETCH_CONCURRENCY = 10;

let cache: {
  anchorSec: number;
  data: RadialHeatmapResult;
  timestamp: number;
} | null = null;
const pendingByAnchor = new Map<number, Promise<RadialHeatmapResult>>();

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

const CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "private, max-age=90",
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "AstroPortfolio/1.0" },
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get("Retry-After") || "3",
          10,
        );
        await sleep(retryAfter * 1000);
        continue;
      }

      if (response.ok) return response;
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch {
      clearTimeout(timeoutId);
      if (attempt === maxRetries - 1) throw new Error("Max retries exceeded");
    }

    await sleep(Math.min(1000 * Math.pow(2, attempt), 4000));
  }

  throw new Error("Max retries exceeded");
}

function normalizeWeeklyArtists(
  raw: unknown,
): { name: string; plays: number }[] {
  const root = raw as {
    weeklyartistchart?: {
      artist?: unknown;
    };
  } | null;
  const artists = root?.weeklyartistchart?.artist;
  const arr = Array.isArray(artists) ? artists : artists ? [artists] : [];
  return arr.map((a: { name?: string; playcount?: string }) => ({
    name: (a?.name ?? "Unknown").trim(),
    plays: parseInt(String(a?.playcount ?? "0"), 10) || 0,
  }));
}

function normalizeChartList(raw: unknown): WeeklyChartEntry[] {
  const root = raw as { weeklychartlist?: { chart?: unknown } } | null;
  const charts = root?.weeklychartlist?.chart;
  const arr = Array.isArray(charts) ? charts : charts ? [charts] : [];
  return arr as WeeklyChartEntry[];
}

async function fetchRollingYearTopArtists(
  username: string,
  apiKey: string,
  fromSec: number,
  toSec: number,
): Promise<{ name: string; plays: number }[]> {
  const url =
    `https://ws.audioscrobbler.com/2.0/?method=user.getweeklyartistchart&user=${encodeURIComponent(username)}` +
    `&from=${fromSec}&to=${toSec}&api_key=${apiKey}&format=json&limit=1000`;
  const response = await fetchWithRetry(url);
  const data = await response.json();
  const list = normalizeWeeklyArtists(data);
  list.sort((a, b) => b.plays - a.plays);
  return list.slice(0, TOP_N);
}

async function fetchWeeklyChartList(
  username: string,
  apiKey: string,
): Promise<RadialHeatmapWeek[]> {
  const url =
    `https://ws.audioscrobbler.com/2.0/?method=user.getweeklychartlist&user=${encodeURIComponent(username)}` +
    `&api_key=${apiKey}&format=json`;
  const response = await fetchWithRetry(url);
  const data = await response.json();
  const entries = normalizeChartList(data)
    .map((c) => ({
      from: parseInt(String(c.from ?? "0"), 10),
      to: parseInt(String(c.to ?? "0"), 10),
    }))
    .filter((w) => w.from > 0 && w.to > 0);
  entries.sort((a, b) => a.from - b.from);
  return entries;
}

async function fetchWeekArtists(
  username: string,
  apiKey: string,
  fromSec: number,
  toSec: number,
) {
  const url =
    `https://ws.audioscrobbler.com/2.0/?method=user.getweeklyartistchart&user=${encodeURIComponent(username)}` +
    `&from=${fromSec}&to=${toSec}&api_key=${apiKey}&format=json&limit=1000`;
  const response = await fetchWithRetry(url);
  const data = await response.json();
  const map = new Map<string, number>();
  const labelByKey = new Map<string, string>();
  for (const { name, plays } of normalizeWeeklyArtists(data)) {
    const key = name.toLowerCase();
    if (!labelByKey.has(key)) labelByKey.set(key, name);
    map.set(key, plays);
  }
  return { map, labelByKey };
}

async function concurrency<T, R>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  let ix = 0;
  const out: R[] = new Array(items.length);
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (true) {
        const j = ix++;
        if (j >= items.length) break;
        out[j] = await run(items[j]);
      }
    },
  );
  await Promise.all(workers);
  return out;
}

function fallbackWeekSlices(
  fromSec: number,
  toSec: number,
): RadialHeatmapWeek[] {
  const SEC_WEEK = 604800;
  const out: RadialHeatmapWeek[] = [];
  let t = fromSec;
  while (t <= toSec) {
    const end = Math.min(t + SEC_WEEK - 1, toSec);
    out.push({ from: t, to: end });
    t += SEC_WEEK;
  }
  return out;
}

function mergeArtistLabels(
  rows: { labelByKey: Map<string, string> }[],
): Map<string, string> {
  const merged = new Map<string, string>();
  for (const row of rows) {
    for (const [k, label] of row.labelByKey) {
      if (!merged.has(k)) merged.set(k, label);
    }
  }
  return merged;
}

function resolveArtistName(
  keyLc: string,
  topTen: { name: string }[],
  labels: Map<string, string>,
): string {
  const fromTop = topTen.find((x) => x.name.toLowerCase() === keyLc)?.name;
  return fromTop ?? labels.get(keyLc) ?? keyLc;
}

const TARGET_WEEKS = 52;
const SECONDS_PER_WEEK = 604800;

function dedupeWeekBoundaryWeeks(weeks: RadialHeatmapWeek[]): RadialHeatmapWeek[] {
  const seen = new Set<string>();
  const out: RadialHeatmapWeek[] = [];
  for (const w of weeks) {
    const key = `${w.from}|${w.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

function selectRollingLastFmWeeks(
  listFromApi: RadialHeatmapWeek[],
  anchorSec: number,
): RadialHeatmapWeek[] {
  if (listFromApi.length === 0) return [];
  const sorted = dedupeWeekBoundaryWeeks(
    listFromApi.filter((w) => w.from > 0 && w.to > 0),
  ).sort((a, b) => a.from - b.from);
  const earliestKeep =
    anchorSec - (TARGET_WEEKS + 1) * SECONDS_PER_WEEK;
  const overlapping = sorted.filter(
    (w) => w.to >= earliestKeep && w.from <= anchorSec,
  );
  if (overlapping.length === 0) return [];
  if (overlapping.length <= TARGET_WEEKS) return overlapping;
  return overlapping.slice(-TARGET_WEEKS);
}

function trimOrPadWeeks(
  weeks: RadialHeatmapWeek[],
  playsPerArtist: Map<string, number[]>,
  fromSec: number,
): { weeks: RadialHeatmapWeek[]; playsPerArtist: Map<string, number[]> } {
  let wk = [...weeks];
  if (wk.length > TARGET_WEEKS) {
    const drop = wk.length - TARGET_WEEKS;
    wk = wk.slice(drop);
    for (const [k, arr] of [...playsPerArtist.entries()]) {
      playsPerArtist.set(k, arr.slice(drop));
    }
  } else if (wk.length < TARGET_WEEKS) {
    const pad = TARGET_WEEKS - wk.length;
    const firstFrom = wk[0]?.from ?? fromSec;
    const paddedWeeks: RadialHeatmapWeek[] = [];
    let cursor = firstFrom;
    for (let i = 0; i < pad; i++) {
      const start = cursor - 604800;
      const end = cursor - 1;
      paddedWeeks.unshift({ from: start, to: end });
      cursor = start;
    }
    wk = [...paddedWeeks, ...wk];
    for (const [k, arr] of [...playsPerArtist.entries()]) {
      const zeros = Array.from({ length: pad }, () => 0);
      playsPerArtist.set(k, [...zeros, ...arr]);
    }
  }
  return { weeks: wk, playsPerArtist };
}

async function fetchRadialHeatmap(
  username: string,
  apiKey: string,
  anchorToSec: number,
): Promise<RadialHeatmapResult> {
  const toSec = anchorToSec;
  const fromSec = toSec - ROLLING_DAYS * SECONDS_PER_DAY;

  const [topTen, listFromApi] = await Promise.all([
    fetchRollingYearTopArtists(username, apiKey, fromSec, toSec),
    fetchWeeklyChartList(username, apiKey),
  ]);
  let weeks =
    listFromApi.length === 0
      ? fallbackWeekSlices(fromSec, toSec)
      : selectRollingLastFmWeeks(listFromApi, anchorToSec);

  if (!weeks.length) {
    weeks = fallbackWeekSlices(fromSec, toSec);
  }

  if (topTen.length === 0) {
    const emptyPlays = new Map<string, number[]>();
    const adjustedEmpty = trimOrPadWeeks(weeks, emptyPlays, fromSec);
    return { weeks: adjustedEmpty.weeks, artists: [] };
  }

  const topKeys = topTen.map((a) => a.name.toLowerCase());

  const weeklyPayload = await concurrency(
    weeks,
    WEEK_FETCH_CONCURRENCY,
    (period) => fetchWeekArtists(username, apiKey, period.from, period.to),
  );

  const labelsMerged = mergeArtistLabels(weeklyPayload);

  const playsPerArtist = new Map<string, number[]>();
  for (const key of topKeys) {
    playsPerArtist.set(
      key,
      weeklyPayload.map(({ map }) => map.get(key) ?? 0),
    );
  }

  const adjusted = trimOrPadWeeks(weeks, playsPerArtist, fromSec);
  weeks = adjusted.weeks;

  const artists: RadialHeatmapArtist[] = topKeys.map((keyLc) => ({
    name: resolveArtistName(keyLc, topTen, labelsMerged),
    plays:
      playsPerArtist.get(keyLc) ??
      Array.from({ length: weeks.length }, () => 0),
  }));

  return { weeks, artists };
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

  if (
    cache &&
    now - cache.timestamp < SERVER_CACHE_MS &&
    Math.abs(cache.anchorSec - anchorSec) <= ANCHOR_MATCH_SEC
  ) {
    return jsonResponse(cache.data, 200, "HIT");
  }

  let inflight = pendingByAnchor.get(anchorSec);
  const reusedPending = inflight !== undefined;
  if (!inflight) {
    inflight = fetchRadialHeatmap(username, apiKey, anchorSec);
    pendingByAnchor.set(anchorSec, inflight);
    inflight.finally(() => {
      pendingByAnchor.delete(anchorSec);
    });
  }

  try {
    const result = await inflight;
    cache = { anchorSec, data: result, timestamp: Date.now() };
    return jsonResponse(result, 200, reusedPending ? "DEDUPED" : "MISS");
  } catch (error) {
    if (cache) {
      return jsonResponse(cache.data, 200, "STALE");
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
