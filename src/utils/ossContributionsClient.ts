import { getPersistentCache, setPersistentCache } from "./persistentCache";

export interface Contribution {
  id: string;
  type: "pr" | "issue";
  title: string;
  url: string;
  createdAt: string;
  commentCount: number;
  repoName: string;
  repoStars: number;
  orgLogo: string;
}

const PERSISTENT_CACHE_KEY = "nikshaan_oss_contributions_v1";
const PERSISTENT_TTL_MS = 24 * 60 * 60 * 1000;
const CLIENT_CACHE_MS = 30 * 60 * 1000;

let inflight: Promise<Contribution[]> | null = null;
let cached: Contribution[] | null = getPersistentCache<Contribution[]>(
  PERSISTENT_CACHE_KEY,
  PERSISTENT_TTL_MS,
);
let cacheTimestamp = cached ? Date.now() : 0;

export function readOssContributionsCache(): Contribution[] | null {
  if (cached && Date.now() - cacheTimestamp < CLIENT_CACHE_MS) return cached;
  const disk = getPersistentCache<Contribution[]>(
    PERSISTENT_CACHE_KEY,
    PERSISTENT_TTL_MS,
  );
  if (disk) {
    cached = disk;
    cacheTimestamp = Date.now();
    return disk;
  }
  return null;
}

export async function fetchOssContributionsData(): Promise<Contribution[]> {
  const now = Date.now();

  if (cached && now - cacheTimestamp < CLIENT_CACHE_MS) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    const baseUrl = import.meta.env.BASE_URL || "/";
    const apiPath = baseUrl.endsWith("/")
      ? "api/oss-contributions"
      : "/api/oss-contributions";
    const response = await fetch(`${baseUrl}${apiPath}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as Contribution[];
    cached = data;
    cacheTimestamp = Date.now();
    setPersistentCache(PERSISTENT_CACHE_KEY, data);
    return data;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
