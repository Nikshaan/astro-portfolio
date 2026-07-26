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
let liveRefreshStarted = false;
const liveRefreshListeners = new Set<(data: MusicStatsData) => void>();

function notifyLiveRefreshListeners(data: MusicStatsData) {
  for (const listener of liveRefreshListeners) {
    listener(data);
  }
}

export function subscribeMusicStatsLiveRefresh(
  listener: (data: MusicStatsData) => void,
) {
  liveRefreshListeners.add(listener);
  ensureMusicStatsLiveRefresh();
  return () => {
    liveRefreshListeners.delete(listener);
  };
}

function ensureMusicStatsLiveRefresh() {
  if (liveRefreshStarted || typeof window === "undefined") return;
  liveRefreshStarted = true;

  const lastPullAt = { t: 0 };
  const refresh = (minGapMs: number) => {
    const now = Date.now();
    if (minGapMs > 0 && now - lastPullAt.t < minGapMs) return;
    lastPullAt.t = now;
    void loadMusicStatsData({ force: true })
      .then((musicData) => {
        notifyLiveRefreshListeners(musicData);
      })
      .catch(() => {});
  };

  window.setInterval(() => refresh(0), 20 * 60 * 1000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh(60_000);
  });
}

export function readMusicStatsCache(): MusicStatsData | null {
  if (cached && Date.now() - cacheTimestamp < CACHE_MS) return cached;
  return null;
}

async function fetchMusicStatsPayload(): Promise<MusicStatsData> {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const apiPath = baseUrl.endsWith("/")
    ? "api/music-stats"
    : "/api/music-stats";
  const response = await fetch(`${baseUrl}${apiPath}`, {
    cache: "no-store",
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
  return musicData;
}

export async function loadMusicStatsData(options?: {
  force?: boolean;
}): Promise<MusicStatsData> {
  scheduleRadialHeatmapWarmup();

  const force = options?.force === true;
  const now = Date.now();
  if (!force && cached && now - cacheTimestamp < CACHE_MS) return cached;

  if (!force && inflight) return inflight;

  const run = () => fetchMusicStatsPayload();

  if (force) return run();

  inflight = run();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
