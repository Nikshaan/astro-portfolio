import { createLiveResource } from "./liveResource";

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
const FRESH_MS = 10 * 60 * 1000;
const POLL_MS = 5 * 60 * 1000;

function validateGithub(data: unknown): GitHubAPIResponse {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid data structure received");
  }
  const response = data as GitHubAPIResponse & { error?: string };
  if (response.error) {
    throw new Error(response.error);
  }
  if (response.errors) return response;
  if (!response.data?.user?.contributionsCollection?.contributionCalendar) {
    throw new Error("Invalid data structure received");
  }
  return response;
}

const resource = createLiveResource<GitHubAPIResponse>({
  key: PERSISTENT_CACHE_KEY,
  url: "api/github-contributions",
  validate: validateGithub,
  freshMs: FRESH_MS,
  pollMs: POLL_MS,
  maxAgeMs: PERSISTENT_TTL_MS,
});

export function readGithubContributionsCache(): GitHubAPIResponse | null {
  return resource.read();
}

export function fetchGithubContributionsData(options?: {
  force?: boolean;
}): Promise<GitHubAPIResponse> {
  return resource.load(options);
}

export function subscribeGithubContributions(
  listener: Parameters<typeof resource.subscribe>[0],
): () => void {
  return resource.subscribe(listener);
}
