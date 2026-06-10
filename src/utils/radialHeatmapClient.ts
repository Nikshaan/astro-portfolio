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

const CLIENT_CACHE_MS = 5 * 60 * 1000;
const UNTIL_BUCKET_SEC = 120;

let cached: RadialHeatmapPayload | null = null;
let cachedAt = 0;
let inflightPromise: Promise<RadialHeatmapPayload> | null = null;

function anchorUntilSec(): number {
  const s = Math.floor(Date.now() / 1000);
  return Math.floor(s / UNTIL_BUCKET_SEC) * UNTIL_BUCKET_SEC;
}

function buildUrl(untilSec: number): string {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const slug = baseUrl.endsWith("/")
    ? "api/music-radial-heatmap"
    : "/api/music-radial-heatmap";
  return `${baseUrl}${slug}?until=${untilSec}`;
}

export function readRadialHeatmapCache(): RadialHeatmapPayload | null {
  if (cached && Date.now() - cachedAt < CLIENT_CACHE_MS) return cached;
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

export async function loadRadialHeatmapPayload(options?: {
  force?: boolean;
}): Promise<RadialHeatmapPayload> {
  const force = options?.force === true;
  const untilSec = anchorUntilSec();
  const now = Date.now();

  if (!force && cached && now - cachedAt < CLIENT_CACHE_MS) return cached;

  if (!force && inflightPromise) return inflightPromise;

  const run = async () => {
    const response = await fetch(buildUrl(untilSec), {
      cache: "default",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await parsePayload(response);
    cached = payload;
    cachedAt = Date.now();
    return payload;
  };

  if (force) {
    return run();
  }

  inflightPromise = run();
  try {
    return await inflightPromise;
  } finally {
    inflightPromise = null;
  }
}
