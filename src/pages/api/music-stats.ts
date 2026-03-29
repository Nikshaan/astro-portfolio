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

export interface GenreEntry {
  genre: string;
  count: number;
}

interface MusicStatsResult {
  weeklyScrobbles: DailyScrobble[];
  upperStatsArray: number[];
  artistsInfo: ArtistInfo[];
  topArtistImageUrl: string;
  topArtistName: string;
  listeningStreak: number;
  genreData: GenreEntry[];
}

const CACHE_DURATION_MS = 5 * 60 * 1000;
let cache: { data: MusicStatsResult; timestamp: number } | null = null;
let pendingRequest: Promise<MusicStatsResult> | null = null;


let spotifyToken: { value: string; expiresAt: number } | null = null;

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

async function getSpotifyToken(clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now();
  if (spotifyToken && now < spotifyToken.expiresAt) return spotifyToken.value;

  const creds = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error('Failed to get Spotify token');
  const json = await res.json();
  spotifyToken = { value: json.access_token, expiresAt: now + (json.expires_in - 60) * 1000 };
  return spotifyToken.value;
}

async function fetchSpotifyArtistImage(
  artistName: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  try {
    const token = await getSpotifyToken(clientId, clientSecret);
    const q = encodeURIComponent(artistName);
    const res = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=artist&limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return '';
    const json = await res.json();
    return json?.artists?.items?.[0]?.images?.[0]?.url ?? '';
  } catch {
    return cache?.data.topArtistImageUrl ?? '';
  }
}

async function fetchListeningStreak(username: string, apiKey: string): Promise<number> {
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&limit=200&api_key=${apiKey}&format=json`;
    const response = await fetchWithRetry(url);
    const data = await response.json();
    const tracks: any[] = data?.recenttracks?.track ?? [];


    const scrobbleDates = new Set<string>();
    for (const track of tracks) {
      const ts = track?.date?.uts;
      if (!ts) continue;
      const d = new Date(parseInt(ts, 10) * 1000);
      scrobbleDates.add(d.toISOString().slice(0, 10));
    }


    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setUTCDate(now.getUTCDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      if (scrobbleDates.has(dateStr)) {
        streak++;
      } else if (i === 0) {

        continue;
      } else {
        break;
      }
    }
    return streak;
  } catch {
    return cache?.data.listeningStreak ?? 0;
  }
}

async function fetchGenreData(artists: ArtistInfo[], apiKey: string): Promise<GenreEntry[]> {
  if (!artists.length) return [];
  try {
    const tagResults = await Promise.all(
      artists.slice(0, 5).map(async (artist) => {
        try {
          const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(artist.name)}&api_key=${apiKey}&format=json`;
          const res = await fetchWithRetry(url);
          const json = await res.json();
          const tags: { name: string; count: number }[] = json?.toptags?.tag ?? [];
          return tags.slice(0, 2);
        } catch {
          return [];
        }
      })
    );

    const aggregated = new Map<string, number>();
    for (const tags of tagResults) {
      for (const tag of tags) {
        const name = tag.name.toLowerCase();
        aggregated.set(name, (aggregated.get(name) ?? 0) + tag.count);
      }
    }

    return Array.from(aggregated.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre, count]) => ({ genre, count }));
  } catch {
    return cache?.data.genreData ?? [];
  }
}

async function fetchMusicStats(
  username: string,
  apiKey: string,
  spotifyClientId: string,
  spotifyClientSecret: string
): Promise<MusicStatsResult> {
  const [userStats, topArtists, listeningStreak, ...dailyScrobbles] = await Promise.all([
    fetchUserStats(username, apiKey),
    fetchTopArtists(username, apiKey),
    fetchListeningStreak(username, apiKey),
    ...Array.from({ length: 7 }, (_, i) => {
      const daysAgo = 6 - i;
      const cachedValue = cache?.data.weeklyScrobbles[i]?.scrobbles;
      return fetchDayScrobbles(username, apiKey, daysAgo, cachedValue);
    })
  ]);

  const topArtistName = topArtists[0]?.name ?? '';

  const [topArtistImageUrl, genreData] = await Promise.all([
    topArtistName && spotifyClientId && spotifyClientSecret
      ? fetchSpotifyArtistImage(topArtistName, spotifyClientId, spotifyClientSecret)
      : Promise.resolve(''),
    fetchGenreData(topArtists, apiKey),
  ]);

  return {
    weeklyScrobbles: dailyScrobbles,
    upperStatsArray: userStats,
    artistsInfo: topArtists,
    topArtistImageUrl: topArtistImageUrl || '',
    topArtistName,
    listeningStreak,
    genreData,
  };
}

export const GET: APIRoute = async () => {
  const apiKey = (import.meta.env.PUBLIC_LASTFM_API_KEY || import.meta.env.PUBLIC__LASTFM_API_KEY) as string;
  const username = (import.meta.env.PUBLIC_LASTFM_USERNAME || import.meta.env.PUBLIC__LASTFM_USERNAME) as string;
  const spotifyClientId = import.meta.env.SPOTIFY_CLIENT_ID as string;
  const spotifyClientSecret = import.meta.env.SPOTIFY_CLIENT_SECRET as string;

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

  pendingRequest = fetchMusicStats(username, apiKey, spotifyClientId, spotifyClientSecret);

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
