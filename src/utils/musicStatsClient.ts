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

const CLIENT_DEDUPE_MS = 20_000;
const READ_CACHE_MS = 5 * 60 * 1000;
const POLL_MS = 90_000;

type StatsListener = (snapshot: MusicStatsSnapshot) => void;

let cached: MusicStatsData | null = null;
let cacheTimestamp = 0;
let inflight: Promise<MusicStatsData> | null = null;
let liveRefreshStarted = false;
let lastPollAt = 0;

const listeners = new Set<StatsListener>();

let snapshot: MusicStatsSnapshot = {
  data: null,
  loading: true,
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

function buildApiUrl() {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const apiPath = baseUrl.endsWith("/")
    ? "api/music-stats"
    : "/api/music-stats";
  return `${baseUrl}${apiPath}`;
}

async function fetchMusicStatsPayload(): Promise<MusicStatsData> {
  scheduleRadialHeatmapWarmup();

  const response = await fetch(buildApiUrl(), {
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
  if (cached && Date.now() - cacheTimestamp < READ_CACHE_MS) return cached;
  return null;
}

export async function loadMusicStatsData(): Promise<MusicStatsData> {
  const now = Date.now();

  if (cached && now - cacheTimestamp < CLIENT_DEDUPE_MS) return cached;
  if (inflight) return inflight;

  inflight = fetchMusicStatsPayload().finally(() => {
    inflight = null;
  });

  return inflight;
}

async function revalidateMusicStats(options?: { silent?: boolean }) {
  const silent = options?.silent === true;

  if (!silent || !cached) {
    setSnapshot({ loading: !cached, error: null });
  }

  try {
    const musicData = await loadMusicStatsData();
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

function poll(minGapMs: number) {
  const now = Date.now();
  if (minGapMs > 0 && now - lastPollAt < minGapMs) return;
  lastPollAt = now;
  void revalidateMusicStats({ silent: true }).catch(() => {});
}

function ensureMusicStatsLiveRefresh() {
  if (liveRefreshStarted || typeof window === "undefined") return;
  liveRefreshStarted = true;

  window.setInterval(() => {
    if (document.visibilityState === "visible") poll(0);
  }, POLL_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    poll(30_000);
  });
}

export function subscribeMusicStats(listener: StatsListener) {
  const isFirst = listeners.size === 0;
  listeners.add(listener);
  listener(snapshot);

  if (isFirst) {
    void revalidateMusicStats({ silent: false });
    ensureMusicStatsLiveRefresh();
  }

  return () => {
    listeners.delete(listener);
  };
}
