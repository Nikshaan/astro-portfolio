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

let inflight: Promise<Contribution[]> | null = null;
let cached: Contribution[] | null = null;
let cacheTimestamp = 0;

const CLIENT_CACHE_MS = 30 * 60 * 1000;

export function readOssContributionsCache(): Contribution[] | null {
  if (cached && Date.now() - cacheTimestamp < CLIENT_CACHE_MS) return cached;
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
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as Contribution[];
    cached = data;
    cacheTimestamp = Date.now();
    return data;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
