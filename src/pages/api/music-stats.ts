import type { APIRoute } from "astro";
import {
  dailyBuckets,
  fetchWithRetry,
  getTimeline,
  listeningStreak,
  peekTimeline,
  topArtists,
  SECONDS_PER_DAY,
  type Timeline,
} from "../../lib/lastfmTimeline";

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

const SERVER_CACHE_MS = 90 * 1000;
const MIN_FORCE_INTERVAL_MS = 60 * 1000;
const LOOKUP_CACHE_MS = 6 * 60 * 60 * 1000;
const TOP_ARTIST_COUNT = 5;

let cache: { data: MusicStatsResult; timestamp: number } | null = null;
let userStatsCache: { value: number[]; timestamp: number } | null = null;
const tagCache = new Map<string, { tags: GenreEntry[]; timestamp: number }>();
const imageCache = new Map<string, { url: string; timestamp: number }>();
let spotifyToken: { value: string; expiresAt: number } | null = null;

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

async function fetchUserStats(
  username: string,
  apiKey: string,
): Promise<number[]> {
  const now = Date.now();
  if (userStatsCache && now - userStatsCache.timestamp < SERVER_CACHE_MS) {
    return userStatsCache.value;
  }
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${encodeURIComponent(username)}&api_key=${apiKey}&format=json`;
    const response = await fetchWithRetry(url);
    const data = await response.json();
    const user = data?.user as LastFmUser | undefined;
    const value = [
      parseInt(user?.playcount || "0", 10),
      parseInt(user?.track_count || "0", 10),
      parseInt(user?.artist_count || "0", 10),
      parseInt(user?.album_count || "0", 10),
    ];
    userStatsCache = { value, timestamp: now };
    return value;
  } catch {
    return userStatsCache?.value ?? cache?.data.upperStatsArray ?? [0, 0, 0, 0];
  }
}

async function fetchArtistTags(
  artist: string,
  apiKey: string,
): Promise<GenreEntry[]> {
  const key = artist.toLowerCase();
  const hit = tagCache.get(key);
  if (hit && Date.now() - hit.timestamp < LOOKUP_CACHE_MS) return hit.tags;

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(artist)}&api_key=${apiKey}&format=json`;
    const res = await fetchWithRetry(url);
    const json = await res.json();
    const raw = json?.toptags?.tag;
    const list = (Array.isArray(raw) ? raw : raw ? [raw] : []) as {
      name?: string;
      count?: number;
    }[];
    const tags = list.slice(0, 2).map((t) => ({
      genre: String(t?.name ?? "").toLowerCase(),
      count: Number(t?.count ?? 0),
    }));
    tagCache.set(key, { tags, timestamp: Date.now() });
    return tags;
  } catch {
    return hit?.tags ?? [];
  }
}

async function buildGenreData(
  artists: ArtistInfo[],
  apiKey: string,
): Promise<GenreEntry[]> {
  if (!artists.length) return cache?.data.genreData ?? [];

  const perArtist = await Promise.all(
    artists.map((a) => fetchArtistTags(a.name, apiKey)),
  );

  const aggregated = new Map<string, number>();
  for (const tags of perArtist) {
    for (const t of tags) {
      if (!t.genre) continue;
      aggregated.set(t.genre, (aggregated.get(t.genre) ?? 0) + t.count);
    }
  }

  return [...aggregated.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }));
}

async function getSpotifyToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const now = Date.now();
  if (spotifyToken && now < spotifyToken.expiresAt) return spotifyToken.value;

  const creds = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("Failed to get Spotify token");

  const json = await res.json();
  spotifyToken = {
    value: json.access_token,
    expiresAt: now + (json.expires_in - 60) * 1000,
  };
  return spotifyToken.value;
}

async function fetchArtistImage(
  artistName: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  if (!artistName || !clientId || !clientSecret) return "";

  const key = artistName.toLowerCase();
  const hit = imageCache.get(key);
  if (hit && Date.now() - hit.timestamp < LOOKUP_CACHE_MS) return hit.url;

  try {
    const token = await getSpotifyToken(clientId, clientSecret);
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return hit?.url ?? "";
    const json = await res.json();
    const url = json?.artists?.items?.[0]?.images?.[0]?.url ?? "";
    imageCache.set(key, { url, timestamp: Date.now() });
    return url;
  } catch {
    return hit?.url ?? cache?.data.topArtistImageUrl ?? "";
  }
}

async function buildStats(
  timeline: Timeline,
  apiKey: string,
  spotifyClientId: string,
  spotifyClientSecret: string,
  anchorSec: number,
  userStatsPromise: Promise<number[]>,
): Promise<MusicStatsResult> {
  const nowMs = Date.now();
  const weekAgo = anchorSec - 7 * SECONDS_PER_DAY;

  const weeklyScrobbles = dailyBuckets(timeline, 7, nowMs);
  const streak = listeningStreak(timeline, nowMs);
  const artistsInfo: ArtistInfo[] = topArtists(
    timeline,
    weekAgo,
    TOP_ARTIST_COUNT,
  ).map((a) => ({ name: a.name, count: String(a.plays) }));
  const topArtistName = artistsInfo[0]?.name ?? "";

  const [upperStatsArray, genreData, topArtistImageUrl] = await Promise.all([
    userStatsPromise,
    buildGenreData(artistsInfo, apiKey),
    fetchArtistImage(topArtistName, spotifyClientId, spotifyClientSecret),
  ]);

  return {
    weeklyScrobbles,
    upperStatsArray,
    artistsInfo,
    topArtistImageUrl: topArtistImageUrl || "",
    topArtistName,
    listeningStreak: streak,
    genreData,
  };
}

export const GET: APIRoute = async ({ request }) => {
  const apiKey = (import.meta.env.LASTFM_API_KEY ||
    import.meta.env.PUBLIC_LASTFM_API_KEY) as string;
  const username = (import.meta.env.LASTFM_USERNAME ||
    import.meta.env.PUBLIC_LASTFM_USERNAME) as string;
  const spotifyClientId = import.meta.env.SPOTIFY_CLIENT_ID as string;
  const spotifyClientSecret = import.meta.env.SPOTIFY_CLIENT_SECRET as string;

  if (!apiKey || !username) {
    return jsonResponse(
      { error: "Last.fm credentials not configured" },
      500,
      "ERROR",
    );
  }

  const url = new URL(request.url);
  const now = Date.now();
  const anchorSec = Math.floor(now / 1000);
  const cacheAge = cache ? now - cache.timestamp : Number.POSITIVE_INFINITY;

  const forceRefresh =
    url.searchParams.get("force") === "1" && cacheAge >= MIN_FORCE_INTERVAL_MS;

  if (!forceRefresh && cache && cacheAge < SERVER_CACHE_MS) {
    return jsonResponse(cache.data, 200, "HIT");
  }

  const userStatsPromise = fetchUserStats(username, apiKey);

  try {
    const timeline = await getTimeline(username, apiKey, anchorSec, {
      force: forceRefresh,
    });
    const data = await buildStats(
      timeline,
      apiKey,
      spotifyClientId,
      spotifyClientSecret,
      anchorSec,
      userStatsPromise,
    );
    cache = { data, timestamp: Date.now() };
    return jsonResponse(data, 200, forceRefresh ? "MISS" : "FRESH");
  } catch (error) {
    if (cache) return jsonResponse(cache.data, 200, "STALE");

    const fallback = peekTimeline();
    if (fallback) {
      try {
        const data = await buildStats(
          fallback,
          apiKey,
          spotifyClientId,
          spotifyClientSecret,
          anchorSec,
          userStatsPromise,
        );
        return jsonResponse(data, 200, "STALE");
      } catch {}
    }

    return jsonResponse(
      {
        error: "Failed to fetch music stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
      "ERROR",
    );
  }
};
