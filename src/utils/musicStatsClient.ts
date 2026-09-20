import { scheduleRadialHeatmapWarmup } from "../components/musicRadialHeatmapWarmup";
import {
  CLIENT_FRESH_MS,
  CLIENT_POLL_MS,
  CLIENT_STALE_MS,
} from "../lib/freshness";
import { createLiveResource, type LiveSnapshot } from "./liveResource";

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

export type MusicStatsSnapshot = LiveSnapshot<MusicStatsData>;

const PERSISTENT_CACHE_KEY = "nikshaan_music_stats_v1";
const PERSISTENT_TTL_MS = 24 * 60 * 60 * 1000;
const FRESH_MS = CLIENT_FRESH_MS;
const POLL_MS = CLIENT_POLL_MS;

function validateMusicStats(data: unknown): MusicStatsData {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid data structure received");
  }
  const musicData = data as MusicStatsData & { error?: string };
  if (musicData.error) {
    throw new Error(musicData.error);
  }
  if (
    !musicData.weeklyScrobbles ||
    !musicData.upperStatsArray ||
    !musicData.artistsInfo
  ) {
    throw new Error("Invalid data structure received");
  }
  return musicData;
}

const resource = createLiveResource<MusicStatsData>({
  key: PERSISTENT_CACHE_KEY,
  url: "api/music-stats",
  validate: validateMusicStats,
  freshMs: FRESH_MS,
  staleAfterMs: CLIENT_STALE_MS,
  pollMs: POLL_MS,
  maxAgeMs: PERSISTENT_TTL_MS,
  onFetch: scheduleRadialHeatmapWarmup,
});

export function getMusicStatsSnapshot(): MusicStatsSnapshot {
  return resource.getSnapshot();
}

export function getMusicStatsServerSnapshot(): MusicStatsSnapshot {
  return resource.getServerSnapshot();
}

export function readMusicStatsCache(): MusicStatsData | null {
  return resource.read();
}

export function loadMusicStatsData(): Promise<MusicStatsData> {
  return resource.load();
}

export function subscribeMusicStats(
  listener: (snapshot: MusicStatsSnapshot) => void,
): () => void {
  return resource.subscribe(listener);
}
