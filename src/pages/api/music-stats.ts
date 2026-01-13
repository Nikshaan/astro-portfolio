import type { APIRoute } from 'astro';

export const prerender = false;

interface LastFmUser {
  playcount: string;
  track_count: string;
  artist_count: string;
  album_count: string;
}

interface ArtistInfo {
  name: string;
  count: string;
}

interface DailyScrobble {
  name: string;
  scrobbles: number;
}

interface MusicStatsResult {
  weeklyScrobbles: DailyScrobble[];
  upperStatsArray: number[];
  artistsInfo: ArtistInfo[];
}

const CACHE_DURATION_MS = 5 * 60 * 1000;
let cache: { data: MusicStatsResult; timestamp: number } | null = null;
let pendingRequest: Promise<MusicStatsResult> | null = null;

const CACHE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=1800',
  'CDN-Cache-Control': 'max-age=600'
} as const;

const jsonResponse = (data: unknown, status: number, cacheStatus: string): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CACHE_HEADERS, 'X-Cache-Status': cacheStatus }
  });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'AstroPortfolio/1.0' }
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

async function fetchDayScrobbles(
  username: string,
  apiKey: string,
  daysAgo: number,
  cachedValue?: number
): Promise<DailyScrobble> {
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(0, 0, 0, 0);

  const from = Math.floor(date.getTime() / 1000);
  const to = from + 86399;
  const dayName = dayLabels[date.getUTCDay()];

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&from=${from}&to=${to}&api_key=${apiKey}&format=json&limit=1`;
    const response = await fetchWithRetry(url);
    const data = await response.json();

    const total = data?.recenttracks?.['@attr']?.total;
    return { name: dayName, scrobbles: total ? parseInt(total, 10) : 0 };
  } catch {
    return { name: dayName, scrobbles: cachedValue ?? 0 };
  }
}

async function fetchUserStats(username: string, apiKey: string): Promise<number[]> {
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${username}&api_key=${apiKey}&format=json`;
    const response = await fetchWithRetry(url);
    const data = await response.json();
    const user = data?.user as LastFmUser | undefined;

    return [
      parseInt(user?.playcount || '0', 10),
      parseInt(user?.track_count || '0', 10),
      parseInt(user?.artist_count || '0', 10),
      parseInt(user?.album_count || '0', 10)
    ];
  } catch {
    return cache?.data.upperStatsArray ?? [0, 0, 0, 0];
  }
}

async function fetchTopArtists(username: string, apiKey: string): Promise<ArtistInfo[]> {
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${username}&period=7day&api_key=${apiKey}&format=json&limit=5`;
    const response = await fetchWithRetry(url);
    const data = await response.json();
    const artists = data?.topartists?.artist;

    if (!artists) return [];

    const artistArray = Array.isArray(artists) ? artists : [artists];
    return artistArray.slice(0, 5).map((a: { name?: string; playcount?: string }) => ({
      name: a?.name || 'Unknown Artist',
      count: a?.playcount || '0'
    }));
  } catch {
    return cache?.data.artistsInfo ?? [];
  }
}

async function fetchMusicStats(username: string, apiKey: string): Promise<MusicStatsResult> {
  const [userStats, topArtists, ...dailyScrobbles] = await Promise.all([
    fetchUserStats(username, apiKey),
    fetchTopArtists(username, apiKey),
    ...Array.from({ length: 7 }, (_, i) => {
      const daysAgo = 6 - i;
      const cachedValue = cache?.data.weeklyScrobbles[i]?.scrobbles;
      return fetchDayScrobbles(username, apiKey, daysAgo, cachedValue);
    })
  ]);

  return {
    weeklyScrobbles: dailyScrobbles,
    upperStatsArray: userStats,
    artistsInfo: topArtists
  };
}

export const GET: APIRoute = async () => {
  const apiKey = (import.meta.env.PUBLIC_LASTFM_API_KEY || import.meta.env.PUBLIC__LASTFM_API_KEY) as string;
  const username = (import.meta.env.PUBLIC_LASTFM_USERNAME || import.meta.env.PUBLIC__LASTFM_USERNAME) as string;

  if (!apiKey || !username) {
    return jsonResponse({ error: 'Last.fm credentials not configured' }, 500, 'ERROR');
  }

  const now = Date.now();

  if (cache && (now - cache.timestamp) < CACHE_DURATION_MS) {
    return jsonResponse(cache.data, 200, 'HIT');
  }

  if (pendingRequest) {
    try {
      const result = await pendingRequest;
      return jsonResponse(result, 200, 'DEDUPED');
    } catch {
    }
  }

  pendingRequest = fetchMusicStats(username, apiKey);

  try {
    const result = await pendingRequest;
    cache = { data: result, timestamp: now };
    pendingRequest = null;
    return jsonResponse(result, 200, 'MISS');
  } catch (error) {
    pendingRequest = null;

    if (cache) {
      return jsonResponse(cache.data, 200, 'STALE');
    }

    return jsonResponse({
      error: 'Failed to fetch music stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500, 'ERROR');
  }
};
