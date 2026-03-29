import type { APIRoute } from 'astro';

export const prerender = false;

export interface HeatmapDay {
  date: string;
  count: number;
}

interface HeatmapResult {
  days: HeatmapDay[];
  totalScrobbles: number;
}


const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
let cache: { data: HeatmapResult; timestamp: number } | null = null;
let pendingRequest: Promise<HeatmapResult> | null = null;

const CACHE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=7200',
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
    const timeoutId = setTimeout(() => controller.abort(), 10000);
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
      if (response.status >= 400 && response.status < 500) throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt === maxRetries - 1) throw err;
    }
    await sleep(Math.min(1000 * Math.pow(2, attempt), 4000));
  }
  throw new Error('Max retries exceeded');
}

async function fetchHeatmapData(username: string, apiKey: string): Promise<HeatmapResult> {
  const now = Math.floor(Date.now() / 1000);
  const oneYearAgo = now - 365 * 24 * 60 * 60;

  const aggregated = new Map<string, number>();
  let page = 1;
  const limit = 200;
  let totalPages = 1;


  while (page <= totalPages && page <= 18) {
    const url =
      `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks` +
      `&user=${username}&from=${oneYearAgo}&to=${now}` +
      `&api_key=${apiKey}&format=json&limit=${limit}&page=${page}`;

    const response = await fetchWithRetry(url);
    const data = await response.json();

    if (page === 1) {
      totalPages = parseInt(data?.recenttracks?.['@attr']?.totalPages ?? '1', 10);
      totalPages = Math.min(totalPages, 18);
    }

    const tracks: any[] = data?.recenttracks?.track ?? [];
    for (const track of tracks) {
      const ts = track?.date?.uts;
      if (!ts) continue;
      const d = new Date(parseInt(ts, 10) * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      aggregated.set(dateStr, (aggregated.get(dateStr) ?? 0) + 1);
    }

    page++;

    if (page <= totalPages) await sleep(50);
  }


  const days: HeatmapDay[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({ date: dateStr, count: aggregated.get(dateStr) ?? 0 });
  }

  const totalScrobbles = Array.from(aggregated.values()).reduce((a, b) => a + b, 0);
  return { days, totalScrobbles };
}

export const GET: APIRoute = async () => {
  const apiKey = (import.meta.env.PUBLIC_LASTFM_API_KEY || import.meta.env.PUBLIC__LASTFM_API_KEY) as string;
  const username = (import.meta.env.PUBLIC_LASTFM_USERNAME || import.meta.env.PUBLIC__LASTFM_USERNAME) as string;

  if (!apiKey || !username) {
    return jsonResponse({ error: 'Last.fm credentials not configured' }, 500, 'ERROR');
  }

  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_DURATION_MS) {
    return jsonResponse(cache.data, 200, 'HIT');
  }

  if (pendingRequest) {
    try {
      const result = await pendingRequest;
      return jsonResponse(result, 200, 'DEDUPED');
    } catch {

    }
  }

  pendingRequest = fetchHeatmapData(username, apiKey);

  try {
    const result = await pendingRequest;
    cache = { data: result, timestamp: now };
    pendingRequest = null;
    return jsonResponse(result, 200, 'MISS');
  } catch (error) {
    pendingRequest = null;
    if (cache) return jsonResponse(cache.data, 200, 'STALE');
    return jsonResponse(
      { error: 'Failed to fetch heatmap data', details: error instanceof Error ? error.message : 'Unknown error' },
      500,
      'ERROR'
    );
  }
};
