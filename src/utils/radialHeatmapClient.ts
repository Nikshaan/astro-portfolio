import { getPersistentCache, setPersistentCache } from "./persistentCache";

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
const CLIENT_DEDUPE_MS = 20_000;
const READ_CACHE_MS = 5 * 60 * 1000;
export const RADIAL_POLL_MS = 5 * 60 * 1000;

let cached: RadialHeatmapPayload | null = getPersistentCache<RadialHeatmapPayload>(
  PERSISTENT_CACHE_KEY,
  PERSISTENT_TTL_MS,
);
let cachedAt = cached ? Date.now() : 0;
let inflightPromise: Promise<RadialHeatmapPayload> | null = null;

function buildUrl(): string {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const slug = baseUrl.endsWith("/")
    ? "api/music-radial-heatmap"
    : "/api/music-radial-heatmap";
  return `${baseUrl}${slug}`;
}

export function readRadialHeatmapCache(): RadialHeatmapPayload | null {
  if (cached && Date.now() - cachedAt < READ_CACHE_MS) return cached;
  const disk = getPersistentCache<RadialHeatmapPayload>(
    PERSISTENT_CACHE_KEY,
    PERSISTENT_TTL_MS,
  );
  if (disk) {
    cached = disk;
    cachedAt = Date.now();
    return disk;
  }
  return null;
}

export function prefetchRadialHeatmapPayload(): void {
  void loadRadialHeatmapPayload().catch(() => {});
}

async function parsePayload(response: Response): Promise<RadialHeatmapPayload> {
  const parsed = (await response.json()) as Record<string, unknown>;
  if (
    parsed?.error ||
    !Array.isArray(parsed?.weeks) ||
    !Array.isArray(parsed?.artists)
  ) {
    throw new Error("Invalid radial heatmap payload");
  }
  return parsed as unknown as RadialHeatmapPayload;
}

export async function loadRadialHeatmapPayload(): Promise<RadialHeatmapPayload> {
  const now = Date.now();

  if (cached && now - cachedAt < CLIENT_DEDUPE_MS) return cached;
  if (inflightPromise) return inflightPromise;

  const run = async () => {
    const response = await fetch(buildUrl(), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await parsePayload(response);
    cached = payload;
    cachedAt = Date.now();
    setPersistentCache(PERSISTENT_CACHE_KEY, payload);
    return payload;
  };

  inflightPromise = run();
  try {
    return await inflightPromise;
  } finally {
    inflightPromise = null;
  }
}
