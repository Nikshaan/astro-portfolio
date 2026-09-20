import {
  CLIENT_FRESH_MS,
  CLIENT_POLL_MS,
  CLIENT_STALE_MS,
} from "../lib/freshness";
import { createLiveResource } from "./liveResource";

export interface RadialHeatmapWeek {
  from: number;
  to: number;
}

export interface RadialHeatmapArtistRow {
  name: string;
  plays: number[];
}

export interface RadialHeatmapPayload {
  weeks: RadialHeatmapWeek[];
  artists: RadialHeatmapArtistRow[];
}


const PERSISTENT_CACHE_KEY = "nikshaan_radial_heatmap_v1";
const PERSISTENT_TTL_MS = 24 * 60 * 60 * 1000;
const FRESH_MS = CLIENT_FRESH_MS;
export const RADIAL_POLL_MS = CLIENT_POLL_MS;

function validateRadial(data: unknown): RadialHeatmapPayload {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid radial heatmap payload");
  }
  const parsed = data as Record<string, unknown>;
  if (
    parsed.error ||
    !Array.isArray(parsed.weeks) ||
    !Array.isArray(parsed.artists)
  ) {
    throw new Error("Invalid radial heatmap payload");
  }
  return parsed as unknown as RadialHeatmapPayload;
}

const resource = createLiveResource<RadialHeatmapPayload>({
  key: PERSISTENT_CACHE_KEY,
  url: "api/music-radial-heatmap",
  validate: validateRadial,
  freshMs: FRESH_MS,
  staleAfterMs: CLIENT_STALE_MS,
  pollMs: RADIAL_POLL_MS,
  maxAgeMs: PERSISTENT_TTL_MS,
});

export function readRadialHeatmapCache(): RadialHeatmapPayload | null {
  return resource.read();
}

export function prefetchRadialHeatmapPayload(): void {
  void resource.load().catch(() => {});
}

export function loadRadialHeatmapPayload(): Promise<RadialHeatmapPayload> {
  return resource.load();
}

export function subscribeRadialHeatmap(
  listener: Parameters<typeof resource.subscribe>[0],
): () => void {
  return resource.subscribe(listener);
}
