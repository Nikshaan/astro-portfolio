import type { APIRoute } from "astro";
import { GH_TOKEN, GH_USERNAME } from "astro:env/server";
import { jsonResponse, keepAlive } from "../../lib/apiResponse";

export const prerender = false;

const CACHE_DURATION = 30 * 60 * 1000;
const REQUEST_TIMEOUT = 8000;
const SEARCH_PAGE_SIZE = 100;

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

let cachedData: Contribution[] | null = null;
let lastFetchTime = 0;
let pendingRequest: Promise<Contribution[]> | null = null;

const QUERY = `
  query($searchQuery: String!, $pageSize: Int!) {
    search(query: $searchQuery, type: ISSUE, first: $pageSize) {
      nodes {
        __typename
        ... on PullRequest {
          title
          url
          createdAt
          merged
          comments {
            totalCount
          }
          repository {
            nameWithOwner
            stargazerCount
            owner {
              __typename
              avatarUrl
            }
          }
        }
        ... on Issue {
          title
          url
          createdAt
          comments {
            totalCount
          }
          repository {
            nameWithOwner
            stargazerCount
            owner {
              __typename
              avatarUrl
            }
          }
        }
      }
    }
  }
`;

interface SearchNode {
  __typename: "PullRequest" | "Issue";
  title?: string;
  url?: string;
  createdAt?: string;
  merged?: boolean;
  comments?: { totalCount?: number };
  repository?: {
    nameWithOwner?: string;
    stargazerCount?: number;
    owner?: { __typename?: "Organization" | "User"; avatarUrl?: string };
  };
}

interface GraphQLResponse {
  data?: { search?: { nodes?: SearchNode[] } };
  errors?: Array<{ message: string }>;
}

function toContribution(node: SearchNode): Contribution | null {
  if (node.__typename === "PullRequest" && !node.merged) return null;
  if (node.repository?.owner?.__typename !== "Organization") return null;
  if (
    !node.title ||
    !node.url ||
    !node.createdAt ||
    !node.repository?.nameWithOwner ||
    !node.repository.owner?.avatarUrl
  ) {
    return null;
  }

  return {
    id: node.url,
    type: node.__typename === "PullRequest" ? "pr" : "issue",
    title: node.title,
    url: node.url,
    createdAt: node.createdAt,
    commentCount: node.comments?.totalCount ?? 0,
    repoName: node.repository.nameWithOwner,
    repoStars: node.repository.stargazerCount ?? 0,
    orgLogo: node.repository.owner.avatarUrl,
  };
}

function respond(
  data: unknown,
  cacheStatus: string,
  fetchedAt: number,
  status = 200,
) {
  const cdn =
    cacheStatus === "STALE" || cacheStatus === "FALLBACK" ? "stale" : "default";
  return jsonResponse(data, { status, cacheStatus, fetchedAt, cdn });
}

async function fetchContributions(): Promise<Contribution[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  const searchQuery = `author:${GH_USERNAME} -user:${GH_USERNAME} is:closed`;

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
      variables: { searchQuery, pageSize: SEARCH_PAGE_SIZE },
    }),
  });

  clearTimeout(timeoutId);

  const data: unknown = await response.json();
  const parsed = data as GraphQLResponse;

  if (parsed.errors || !parsed.data?.search?.nodes) {
    throw new Error("Invalid GitHub search response");
  }

  const contributions = parsed.data.search.nodes
    .map(toContribution)
    .filter((c): c is Contribution => c !== null)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  cachedData = contributions;
  lastFetchTime = Date.now();
  return contributions;
}

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

  const run = fetchContributions();
  pendingRequest = run;
  keepAlive(run);
  void run.catch(() => {}).finally(() => {
    if (pendingRequest === run) pendingRequest = null;
  });

  try {
    const data = cachedData
      ? await Promise.race([
          run,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 3500),
          ),
        ])
      : await run;

    return respond(data, "MISS", lastFetchTime);
  } catch {
    if (cachedData) {
      return respond(cachedData, "STALE", lastFetchTime);
    }

    return respond([], "FALLBACK", 0);
  }
};
