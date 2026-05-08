import type { APIRoute } from 'astro';

export const prerender = false;

export interface YearlyArcWeek {
  from: number;
  to: number;
}

export interface YearlyArcArtist {
  name: string;
  plays: number[];
}

export interface YearlyArcResult {
  weeks: YearlyArcWeek[];
  artists: YearlyArcArtist[];
}

interface WeeklyChartEntry {
  from?: string;
  to?: string;
}

const SERVER_CACHE_MS = 90 * 1000;
const ANCHOR_MATCH_SEC = 180;

let cache:
  | {
      anchorSec: number;
      data: YearlyArcResult;
      timestamp: number;
    }
  | null = null;
const pendingByAnchor = new Map<number, Promise<YearlyArcResult>>();

function resolvedAnchorSec(serverSec: number, clientParam: string | null): number {
  if (clientParam == null || clientParam === '') return serverSec;
  const v = parseInt(clientParam, 10);
  if (!Number.isFinite(v) || v <= 0) return serverSec;
  if (Math.abs(serverSec - v) > 900) return serverSec;
  return v;
}

const CACHE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, max-age=0',
} as const;

const jsonResponse = (data: unknown, status: number, cacheStatus: string): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CACHE_HEADERS, 'X-Cache-Status': cacheStatus },
  });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'AstroPortfolio/1.0' },
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '3', 10);
        await sleep(retryAfter * 1000);
        continue;
      }

      if (response.ok) return response;
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (attempt === maxRetries - 1) throw err;
    }

    await sleep(Math.min(1000 * Math.pow(2, attempt), 4000));
  }

  throw new Error('Max retries exceeded');
}

function normalizeWeeklyArtists(raw: unknown): { name: string; plays: number }[] {
  const root = raw as {
    weeklyartistchart?: {
      artist?: unknown;
    };
  } | null;
  const artists = root?.weeklyartistchart?.artist;
  const arr = Array.isArray(artists) ? artists : artists ? [artists] : [];
  return arr.map((a: { name?: string; playcount?: string }) => ({
    name: (a?.name ?? 'Unknown').trim(),
    plays: parseInt(String(a?.playcount ?? '0'), 10) || 0,
  }));
}

function normalizeChartList(raw: unknown): WeeklyChartEntry[] {
  const root = raw as { weeklychartlist?: { chart?: unknown } } | null;
  const charts = root?.weeklychartlist?.chart;
  const arr = Array.isArray(charts) ? charts : charts ? [charts] : [];
  return arr as WeeklyChartEntry[];
}

async function fetchYearRangeTopArtists(
  username: string,
  apiKey: string,
  fromSec: number,
  toSec: number
): Promise<{ name: string; plays: number }[]> {
  try {
    const url =
      `https://ws.audioscrobbler.com/2.0/?method=user.getweeklyartistchart&user=${encodeURIComponent(username)}` +
      `&from=${fromSec}&to=${toSec}&api_key=${apiKey}&format=json`;
    const response = await fetchWithRetry(url);
    const data = await response.json();
    const list = normalizeWeeklyArtists(data);
    list.sort((a, b) => b.plays - a.plays);
    return list;
  } catch {
    return [];
  }
}

async function fetchWeeklyChartList(username: string, apiKey: string): Promise<YearlyArcWeek[]> {
  try {
    const url =
      `https://ws.audioscrobbler.com/2.0/?method=user.getweeklychartlist&user=${encodeURIComponent(username)}` +
      `&api_key=${apiKey}&format=json`;
    const response = await fetchWithRetry(url);
    const data = await response.json();
    const entries = normalizeChartList(data)
      .map((c) => ({
        from: parseInt(String(c.from ?? '0'), 10),
        to: parseInt(String(c.to ?? '0'), 10),
      }))
      .filter((w) => w.from > 0 && w.to > 0);
    entries.sort((a, b) => a.from - b.from);
    return entries;
  } catch {
    return [];
  }
}

async function fetchWeekArtists(username: string, apiKey: string, fromSec: number, toSec: number) {
  const url =
    `https://ws.audioscrobbler.com/2.0/?method=user.getweeklyartistchart&user=${encodeURIComponent(username)}` +
    `&from=${fromSec}&to=${toSec}&api_key=${apiKey}&format=json`;
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

async function concurrency<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>): Promise<R[]> {
  let ix = 0;
  const out: R[] = new Array(items.length);
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const j = ix++;
      if (j >= items.length) break;
      out[j] = await run(items[j]);
    }
  });
  await Promise.all(workers);
  return out;
}

function overlapsRange(w: YearlyArcWeek, fromSec: number, toSec: number): boolean {
  return w.to >= fromSec && w.from <= toSec;
}

function fallbackWeekSlices(fromSec: number, toSec: number): YearlyArcWeek[] {
  const SEC_WEEK = 604800;
  const out: YearlyArcWeek[] = [];
  let t = fromSec;
  while (t <= toSec) {
    const end = Math.min(t + SEC_WEEK - 1, toSec);
    out.push({ from: t, to: end });
    t += SEC_WEEK;
  }
  return out;
}

function mergeArtistLabels(rows: { labelByKey: Map<string, string> }[]): Map<string, string> {
  const merged = new Map<string, string>();
  for (const row of rows) {
    for (const [k, label] of row.labelByKey) {
      if (!merged.has(k)) merged.set(k, label);
    }
  }
  return merged;
}

function resolveArtistName(keyLc: string, rankedYear: { name: string }[], labels: Map<string, string>): string {
  const fromYear = rankedYear.find((x) => x.name.toLowerCase() === keyLc)?.name;
  return fromYear ?? labels.get(keyLc) ?? keyLc;
}

async function fetchYearlyArc(
  username: string,
  apiKey: string,
  anchorToSec: number
): Promise<YearlyArcResult> {
  const toMs = anchorToSec * 1000;
  const d = new Date(toMs);
  const fromMs = Date.UTC(
    d.getUTCFullYear() - 1,
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds()
  );
  const fromSec = Math.floor(fromMs / 1000);
  const toSec = anchorToSec;

  const rankedYear = await fetchYearRangeTopArtists(username, apiKey, fromSec, toSec);

  const listFromApi = await fetchWeeklyChartList(username, apiKey);
  let weeks =
    listFromApi.length === 0
      ? fallbackWeekSlices(fromSec, toSec)
      : listFromApi.filter((w) => overlapsRange(w, fromSec, toSec));

  if (!weeks.length) {
    weeks = fallbackWeekSlices(fromSec, toSec);
  }

  const weeklyPayload = await concurrency(weeks, 4, (w) =>
    fetchWeekArtists(username, apiKey, w.from, w.to)
  );

  const aggregate = new Map<string, number>();
  for (const { map } of weeklyPayload) {
    for (const [k, plays] of map) {
      aggregate.set(k, (aggregate.get(k) ?? 0) + plays);
    }
  }

  const labelsMerged = mergeArtistLabels(weeklyPayload);

  const keyOrder: string[] = [];
  const rankedSeen = new Set<string>();
  for (const a of rankedYear) {
    const k = a.name.toLowerCase();
    if (rankedSeen.has(k)) continue;
    rankedSeen.add(k);
    keyOrder.push(k);
    if (keyOrder.length >= 10) break;
  }

  const seen = new Set(keyOrder);
  if (keyOrder.length < 10) {
    for (const [k] of [...aggregate.entries()].sort((a, b) => b[1] - a[1])) {
      if (keyOrder.length >= 10) break;
      if (!seen.has(k)) {
        seen.add(k);
        keyOrder.push(k);
      }
    }
  }

  if (!keyOrder.length) {
    for (const [k] of [...aggregate.entries()].sort((a, b) => b[1] - a[1])) {
      keyOrder.push(k);
      if (keyOrder.length >= 10) break;
    }
  }

  keyOrder.sort((ka, kb) => (aggregate.get(kb) ?? 0) - (aggregate.get(ka) ?? 0));

  return {
    weeks,
    artists: keyOrder.map((keyLc) => ({
      name: resolveArtistName(keyLc, rankedYear, labelsMerged),
      plays: weeklyPayload.map(({ map }) => map.get(keyLc) ?? 0),
    })),
  };
}

export const GET: APIRoute = async ({ request }) => {
  const apiKey = (import.meta.env.LASTFM_API_KEY || import.meta.env.PUBLIC_LASTFM_API_KEY) as string;
  const username = (import.meta.env.LASTFM_USERNAME || import.meta.env.PUBLIC_LASTFM_USERNAME) as string;

  if (!apiKey || !username) {
    return jsonResponse({ error: 'Last.fm credentials not configured' }, 500, 'ERROR');
  }

  const serverSec = Math.floor(Date.now() / 1000);
  const url = new URL(request.url);
  const anchorSec = resolvedAnchorSec(serverSec, url.searchParams.get('until'));
  const now = Date.now();

  if (
    cache &&
    now - cache.timestamp < SERVER_CACHE_MS &&
    Math.abs(cache.anchorSec - anchorSec) <= ANCHOR_MATCH_SEC
  ) {
    return jsonResponse(cache.data, 200, 'HIT');
  }

  let inflight = pendingByAnchor.get(anchorSec);
  const reusedPending = inflight !== undefined;
  if (!inflight) {
    inflight = fetchYearlyArc(username, apiKey, anchorSec);
    pendingByAnchor.set(anchorSec, inflight);
    inflight.finally(() => {
      pendingByAnchor.delete(anchorSec);
    });
  }

  try {
    const result = await inflight;
    cache = { anchorSec, data: result, timestamp: Date.now() };
    return jsonResponse(result, 200, reusedPending ? 'DEDUPED' : 'MISS');
  } catch (error) {
    if (cache) {
      return jsonResponse(cache.data, 200, 'STALE');
    }

    return jsonResponse(
      {
        error: 'Failed to fetch yearly arc',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
      'ERROR'
    );
  }
};
