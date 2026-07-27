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

export interface MusicStatsSnapshot {
  data: MusicStatsData | null;
  loading: boolean;
  error: string | null;
}

const CACHE_MS = 5 * 60 * 1000;
const LIVE_REFRESH_MS = 20 * 60 * 1000;
const VISIBILITY_MIN_GAP_MS = 60_000;

type StatsListener = (snapshot: MusicStatsSnapshot) => void;

let cached: MusicStatsData | null = null;
let cacheTimestamp = 0;
let inflight: Promise<MusicStatsData> | null = null;
let liveRefreshStarted = false;
let lastLiveRefreshAt = 0;

const listeners = new Set<StatsListener>();

let snapshot: MusicStatsSnapshot = {
  data: null,
  loading: false,
  error: null,
};

function emit() {
  for (const listener of listeners) {
    listener(snapshot);
  }
}

function setSnapshot(patch: Partial<MusicStatsSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  emit();
}

function buildApiUrl(force: boolean) {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const apiPath = baseUrl.endsWith("/")
    ? "api/music-stats"
    : "/api/music-stats";
  const url = `${baseUrl}${apiPath}`;
  return force ? `${url}?_=${Date.now()}` : url;
}

async function fetchMusicStatsPayload(force: boolean): Promise<MusicStatsData> {
  scheduleRadialHeatmapWarmup();

  const response = await fetch(buildApiUrl(force), {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to fetch music stats`);
  }

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

export function readMusicStatsCache(): MusicStatsData | null {
  if (cached && Date.now() - cacheTimestamp < CACHE_MS) return cached;
  return null;
}

export async function loadMusicStatsData(options?: {
  force?: boolean;
}): Promise<MusicStatsData> {
  const force = options?.force === true;
  const now = Date.now();

  if (!force && cached && now - cacheTimestamp < CACHE_MS) return cached;

  if (inflight) {
    if (!force) return inflight;
    await inflight.catch(() => {});
  }

  inflight = fetchMusicStatsPayload(force).finally(() => {
    inflight = null;
  });

  return inflight;
}

async function revalidateMusicStats(options?: {
  force?: boolean;
  silent?: boolean;
}) {
  const force = options?.force === true;
  const silent = options?.silent === true;
  const now = Date.now();

  if (!force && cached && now - cacheTimestamp < CACHE_MS) {
    setSnapshot({ data: cached, loading: false, error: null });
    return cached;
  }

  if (!silent || !cached) {
    setSnapshot({ loading: true, error: null });
  }

  try {
    const musicData = await loadMusicStatsData(force ? { force: true } : undefined);
    setSnapshot({ data: musicData, loading: false, error: null });
    return musicData;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load music stats";
    if (cached) {
      setSnapshot({ data: cached, loading: false, error: null });
      return cached;
    }
    setSnapshot({ data: null, loading: false, error: message });
    throw err;
  }
}

function runLiveRefresh(minGapMs: number) {
  const now = Date.now();
  if (minGapMs > 0 && now - lastLiveRefreshAt < minGapMs) return;
  lastLiveRefreshAt = now;
  void revalidateMusicStats({ force: true, silent: true }).catch(() => {});
}

function ensureMusicStatsLiveRefresh() {
  if (liveRefreshStarted || typeof window === "undefined") return;
  liveRefreshStarted = true;

  window.setInterval(() => runLiveRefresh(0), LIVE_REFRESH_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") runLiveRefresh(VISIBILITY_MIN_GAP_MS);
  });
}

export function subscribeMusicStats(listener: StatsListener) {
  const isFirst = listeners.size === 0;
  listeners.add(listener);
  listener(snapshot);

  if (isFirst) {
    void revalidateMusicStats({ silent: !!cached });
    ensureMusicStatsLiveRefresh();
  }

  return () => {
    listeners.delete(listener);
  };
}
