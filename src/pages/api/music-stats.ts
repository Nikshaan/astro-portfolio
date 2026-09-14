import type { APIRoute } from "astro";
import {
  LASTFM_API_KEY,
  LASTFM_USERNAME,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
} from "astro:env/server";
import { jsonResponse, keepAlive } from "../../lib/apiResponse";
import {
  dailyBuckets,
  effectiveFetchedAt,
  fetchWithRetry,
  getTimeline,
  istDayStartSec,
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

const SERVER_CACHE_MS = 5 * 60 * 1000;
const LOOKUP_CACHE_MS = 6 * 60 * 60 * 1000;
const TOP_ARTIST_COUNT = 5;
const TOP_TAGS_PER_ARTIST = 3;

let cache: {
  data: MusicStatsResult;
  timestamp: number;
  fetchedAt: number;
} | null = null;
let userStatsCache: { value: number[]; timestamp: number } | null = null;
const tagCache = new Map<string, { tags: GenreEntry[]; timestamp: number }>();
const imageCache = new Map<string, { url: string; timestamp: number }>();
let spotifyToken: { value: string; expiresAt: number } | null = null;

function respond(
  data: unknown,
  cacheStatus: string,
  fetchedAt: number,
  status = 200,
) {
  const cdn =
    cacheStatus === "STALE" || cacheStatus === "FALLBACK" ? "stale" : "music";
  return jsonResponse(data, { status, cacheStatus, fetchedAt, cdn });
}

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
    const tags = list.slice(0, TOP_TAGS_PER_ARTIST).map((t) => ({
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
  artists.forEach((artist, i) => {
    const tags = perArtist[i];
    const tagTotal = tags.reduce((sum, t) => sum + t.count, 0);
    if (tagTotal <= 0) return;
    const plays = parseInt(artist.count, 10) || 0;
    for (const t of tags) {
      if (!t.genre) continue;
      const weight = (t.count / tagTotal) * plays;
      aggregated.set(t.genre, (aggregated.get(t.genre) ?? 0) + weight);
    }
  });

  return [...aggregated.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count: Math.round(count * 100) / 100 }));
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
    const item = json?.artists?.items?.[0];
    const matches =
      typeof item?.name === "string" &&
      item.name.toLowerCase() === key;
    const url = matches ? (item?.images?.[0]?.url ?? "") : "";
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
  userStatsPromise: Promise<number[]>,
): Promise<MusicStatsResult> {
  const nowMs = Date.now();
  const weekAgo = istDayStartSec(nowMs) - 6 * SECONDS_PER_DAY;

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

let pendingRequest: Promise<MusicStatsResult> | null = null;

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
  const anchorSec = Math.floor(now / 1000);
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

  const execute = async (): Promise<MusicStatsResult> => {
    const userStatsPromise = fetchUserStats(LASTFM_USERNAME, LASTFM_API_KEY);
    const timeline = await getTimeline(
      LASTFM_USERNAME,
      LASTFM_API_KEY,
      anchorSec,
    );
    const data = await buildStats(
      timeline,
      LASTFM_API_KEY,
      SPOTIFY_CLIENT_ID ?? "",
      SPOTIFY_CLIENT_SECRET ?? "",
      userStatsPromise,
    );
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
      try {
        const userStatsPromise = fetchUserStats(
          LASTFM_USERNAME,
          LASTFM_API_KEY,
        );
        const data = await buildStats(
          fallback,
          LASTFM_API_KEY,
          SPOTIFY_CLIENT_ID ?? "",
          SPOTIFY_CLIENT_SECRET ?? "",
          userStatsPromise,
        );
        const fetchedAt = effectiveFetchedAt(fallback);
        if (!cache || cache.timestamp === 0) {
          cache = { data, timestamp: 0, fetchedAt };
        }
        return respond(data, "STALE", fetchedAt);
      } catch {}
    }

    return respond(
      {
        error: "Failed to fetch music stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      "ERROR",
      0,
      500,
    );
  }
};
