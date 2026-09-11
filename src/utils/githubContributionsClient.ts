import { getPersistentCache, setPersistentCache } from "./persistentCache";

export type ContributionLevel =
  | "NONE"
  | "FIRST_QUARTILE"
  | "SECOND_QUARTILE"
  | "THIRD_QUARTILE"
  | "FOURTH_QUARTILE";

export interface ContributionDay {
  contributionCount: number;
  date: string;
  color: string;
  contributionLevel?: ContributionLevel;
}

export interface ContributionWeek {
  contributionDays: ContributionDay[];
}

export interface ContributionCalendar {
  totalContributions: number;
  weeks: ContributionWeek[];
}

export interface ContributionsCollection {
  contributionCalendar: ContributionCalendar;
}

export interface GitHubUser {
  contributionsCollection: ContributionsCollection;
}

export interface GitHubAPIResponse {
  data: {
    user: GitHubUser;
  };
  errors?: Array<{ message: string }>;
}

const PERSISTENT_CACHE_KEY = "nikshaan_github_contributions_v1";
const PERSISTENT_TTL_MS = 12 * 60 * 60 * 1000;
const CLIENT_CACHE_MS = 60 * 1000;

let inflight: Promise<GitHubAPIResponse> | null = null;
let cached: GitHubAPIResponse | null = getPersistentCache<GitHubAPIResponse>(
  PERSISTENT_CACHE_KEY,
  PERSISTENT_TTL_MS,
);
let cacheTimestamp = cached ? Date.now() : 0;

export function readGithubContributionsCache(): GitHubAPIResponse | null {
  if (cached && Date.now() - cacheTimestamp < CLIENT_CACHE_MS) return cached;
  const disk = getPersistentCache<GitHubAPIResponse>(
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

export async function fetchGithubContributionsData(options?: {
  force?: boolean;
}): Promise<GitHubAPIResponse> {
  const force = options?.force === true;
  const now = Date.now();

  if (!force && cached && now - cacheTimestamp < CLIENT_CACHE_MS) return cached;

  if (inflight) {
    if (!force) return inflight;
    await inflight.catch(() => {});
  }

  inflight = (async () => {
    const baseUrl = import.meta.env.BASE_URL || "/";
    const apiPath = baseUrl.endsWith("/")
      ? "api/github-contributions"
      : "/api/github-contributions";
    const response = await fetch(`${baseUrl}${apiPath}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as GitHubAPIResponse;
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
