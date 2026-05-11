import { scheduleRadialHeatmapWarmup } from "../components/musicRadialHeatmapWarmup";

export interface GenreEntry {
  genre: string;
  count: number;
}

interface ArtistInfoType {
  name?: string;
  count?: string;
}

interface Daily {
  name?: string;
  scrobbles?: number;
}

export interface MusicStatsData {
  weeklyScrobbles: Daily[];
  upperStatsArray: number[];
  artistsInfo: ArtistInfoType[];
  topArtistImageUrl?: string;
  topArtistName?: string;
  listeningStreak?: number;
  genreData?: GenreEntry[];
}

const CACHE_MS = 5 * 60 * 1000;

let cached: MusicStatsData | null = null;
let cacheTimestamp = 0;
let inflight: Promise<MusicStatsData> | null = null;

export function readMusicStatsCache(): MusicStatsData | null {
  if (cached && Date.now() - cacheTimestamp < CACHE_MS) return cached;
  return null;
}

export async function loadMusicStatsData(): Promise<MusicStatsData> {
  const now = Date.now();
  if (cached && now - cacheTimestamp < CACHE_MS) return cached;

  if (inflight) return inflight;

  inflight = (async () => {
    const baseUrl = import.meta.env.BASE_URL || "/";
    const apiPath = baseUrl.endsWith("/")
      ? "api/music-stats"
      : "/api/music-stats";
    const response = await fetch(`${baseUrl}${apiPath}`, {
      cache: "default",
      headers: { Accept: "application/json" },
    });
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: Failed to fetch music stats`);
    const musicData = (await response.json()) as MusicStatsData;
    if (
      !musicData.weeklyScrobbles ||
      !musicData.upperStatsArray ||
      !musicData.artistsInfo
    ) {
      throw new Error("Invalid data structure received");
    }
    cached = musicData;
    cacheTimestamp = Date.now();
    scheduleRadialHeatmapWarmup();
    return musicData;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
