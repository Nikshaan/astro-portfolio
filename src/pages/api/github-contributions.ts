import type { APIRoute } from "astro";
import { GH_TOKEN, GH_USERNAME } from "astro:env/server";

export const prerender = false;

const CACHE_DURATION = 60 * 1000;
const REQUEST_TIMEOUT = 8000;
let cachedData: GitHubResponse | null = null;
let lastFetchTime = 0;
let pendingRequest: Promise<GitHubResponse> | null = null;

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
    return new Response(
      JSON.stringify({
        error: "GitHub credentials not configured",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const now = Date.now();
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return new Response(JSON.stringify(cachedData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
        "X-Cache-Status": "HIT",
      },
    });
  }

  if (pendingRequest) {
    try {
      const data = await pendingRequest;
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
          "X-Cache-Status": "DEDUPED",
        },
      });
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
      throw new Error("Invalid API response structure");
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

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
        "X-Cache-Status": "MISS",
      },
    });
  } catch {
    if (cachedData) {
      return new Response(JSON.stringify(cachedData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
          "X-Cache-Status": "STALE",
        },
      });
    }

    return new Response(JSON.stringify(FALLBACK_DATA), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Cache-Status": "FALLBACK",
      },
    });
  }
};
