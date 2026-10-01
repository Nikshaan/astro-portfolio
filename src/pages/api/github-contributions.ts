import type { APIRoute } from "astro";
import { GH_TOKEN, GH_USERNAME } from "astro:env/server";
import { jsonResponse, logApiError } from "../../lib/apiResponse";

export const prerender = false;

const CACHE_DURATION = 15 * 60 * 1000;
const REQUEST_TIMEOUT = 8000;
let cachedData: GitHubResponse | null = null;
let lastFetchTime = 0;
let pendingRequest: Promise<GitHubResponse> | null = null;

/** GraphQL reported errors (rate limit, bad login...): usable body, never cache it. */
class GraphQLErrorsResponse extends Error {
  constructor(readonly body: GitHubResponse) {
    super(body.errors?.map((e) => e.message).join("; ") || "GraphQL errors");
  }
}

export type ContributionLevel =
  | "NONE"
  | "FIRST_QUARTILE"
  | "SECOND_QUARTILE"
  | "THIRD_QUARTILE"
  | "FOURTH_QUARTILE";

interface ContributionDay {
  contributionCount: number;
  date: string;
  color: string;
  contributionLevel: ContributionLevel;
}

interface ContributionWeek {
  contributionDays: ContributionDay[];
}

interface ContributionCalendar {
  totalContributions: number;
  weeks: ContributionWeek[];
}

interface GitHubResponse {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: ContributionCalendar;
      };
    };
  };
  errors?: Array<{ message: string }>;
}

function isValidGitHubResponse(data: unknown): data is GitHubResponse {
  if (typeof data !== "object" || data === null) return false;
  const response = data as GitHubResponse;
  if (response.errors) return true;
  return !!response.data?.user?.contributionsCollection?.contributionCalendar;
}

function respond(
  data: unknown,
  cacheStatus: string,
  fetchedAt: number,
  status = 200,
) {
  const cdn =
    cacheStatus === "STALE" ||
    cacheStatus === "FALLBACK" ||
    cacheStatus === "UPSTREAM_ERROR"
      ? "stale"
      : "default";
  return jsonResponse(data, { status, cacheStatus, fetchedAt, cdn });
}

const FALLBACK_DATA: GitHubResponse = {
  data: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: 0,
          weeks: [],
        },
      },
    },
  },
};

const QUERY = `
  query($username: String!) {
    user(login: $username) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
              color
              contributionLevel
            }
          }
        }
      }
    }
  }
`;

export const GET: APIRoute = async () => {
  if (!GH_TOKEN || !GH_USERNAME) {
    return respond(
      { error: "GitHub credentials not configured" },
      "ERROR",
      0,
      500,
    );
  }

  const now = Date.now();
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return respond(cachedData, "HIT", lastFetchTime);
  }

  if (pendingRequest) {
    try {
      const data = await pendingRequest;
      return respond(data, "DEDUPED", lastFetchTime || Date.now());
    } catch {}
  }

  const run = (async (): Promise<GitHubResponse> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { username: GH_USERNAME },
      }),
    });

    clearTimeout(timeoutId);

    const data: unknown = await response.json();

    if (!isValidGitHubResponse(data)) {
      throw new Error(`Invalid API response structure (HTTP ${response.status})`);
    }
    if (data.errors) {
      throw new GraphQLErrorsResponse(data);
    }

    cachedData = data;
    lastFetchTime = Date.now();
    return data;
  })();

  pendingRequest = run;
  void run.catch(() => {}).finally(() => {
    if (pendingRequest === run) pendingRequest = null;
  });

  try {
    const data = await run;
    return respond(data, "MISS", lastFetchTime);
  } catch (error) {
    logApiError("github-contributions", "graphql", error);
    if (cachedData) {
      return respond(cachedData, "STALE", lastFetchTime);
    }

    // Same body the client has always received for GraphQL errors, but served
    // with the short "stale" CDN profile and without poisoning the server cache.
    if (error instanceof GraphQLErrorsResponse) {
      return respond(error.body, "UPSTREAM_ERROR", 0);
    }

    return respond(FALLBACK_DATA, "FALLBACK", 0);
  }
};
