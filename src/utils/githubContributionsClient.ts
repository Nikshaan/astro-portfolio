export interface ContributionDay {
  contributionCount: number;
  date: string;
  color: string;
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

let inflight: Promise<GitHubAPIResponse> | null = null;
let cached: GitHubAPIResponse | null = null;
let cacheTimestamp = 0;

const CLIENT_CACHE_MS = 55 * 60 * 1000;

export function readGithubContributionsCache(): GitHubAPIResponse | null {
  if (cached && Date.now() - cacheTimestamp < CLIENT_CACHE_MS) return cached;
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
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as GitHubAPIResponse;
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
