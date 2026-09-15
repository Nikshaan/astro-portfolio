import type { APIRoute } from "astro";
import { GH_TOKEN, GH_USERNAME } from "astro:env/server";
import { jsonResponse } from "../../lib/apiResponse";

export const prerender = false;

const CACHE_DURATION = 15 * 60 * 1000;
const REPO_META_TTL = 6 * 60 * 60 * 1000;
const REPO_META_ERROR_TTL = 60 * 1000;
const REQUEST_TIMEOUT = 12_000;
const SEARCH_PAGE_SIZE = 100;
const MAX_SEARCH_PAGES = 5;
const USER_AGENT = "nikshaan.dev";

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

interface RepoMeta {
  stars: number;
  orgLogo: string;
  isOrg: boolean;
}

interface SearchItem {
  html_url?: string;
  title?: string;
  created_at?: string;
  comments?: number;
  pull_request?: { merged_at?: string | null };
  repository_url?: string;
}

interface SearchResponse {
  total_count?: number;
  incomplete_results?: boolean;
  items?: SearchItem[];
}

interface RepoResponse {
  stargazers_count?: number;
  owner?: { type?: string; avatar_url?: string };
}

let cachedData: Contribution[] | null = null;
let lastFetchTime = 0;
let pendingRequest: Promise<Contribution[]> | null = null;
const repoMetaCache = new Map<
  string,
  { meta: RepoMeta | null; timestamp: number }
>();

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

function repoFromSearchItem(item: SearchItem): string | null {
  const url = item.repository_url;
  if (!url) return null;
  const marker = "/repos/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const name = url.slice(index + marker.length).replace(/\/+$/, "");
  return name.includes("/") ? name : null;
}

function githubHeaders(auth: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": USER_AGENT,
  };
  if (auth && GH_TOKEN) headers.Authorization = `Bearer ${GH_TOKEN}`;
  return headers;
}

async function githubJson<T>(
  url: string,
  signal: AbortSignal,
  auth: boolean,
): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal,
    headers: githubHeaders(auth),
  });
  if (!response.ok) {
    throw new Error(`GitHub HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

async function githubJsonPreferAuth<T>(
  url: string,
  signal: AbortSignal,
): Promise<T> {
  try {
    return await githubJson<T>(url, signal, true);
  } catch {
    return await githubJson<T>(url, signal, false);
  }
}

async function searchIssues(
  query: string,
  signal: AbortSignal,
): Promise<SearchItem[]> {
  const items: SearchItem[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (page <= MAX_SEARCH_PAGES && items.length < total) {
    const params = new URLSearchParams({
      q: query,
      sort: "updated",
      order: "desc",
      per_page: String(SEARCH_PAGE_SIZE),
      page: String(page),
    });
    const url = `https://api.github.com/search/issues?${params}`;
    const data = await githubJsonPreferAuth<SearchResponse>(url, signal);
    const batch = Array.isArray(data.items) ? data.items : [];
    total = typeof data.total_count === "number" ? data.total_count : batch.length;
    items.push(...batch);
    if (batch.length < SEARCH_PAGE_SIZE) break;
    page += 1;
  }

  return items;
}

async function fetchRepoMeta(
  repoName: string,
  signal: AbortSignal,
): Promise<RepoMeta | null> {
  const cached = repoMetaCache.get(repoName);
  if (cached) {
    const ttl = cached.meta ? REPO_META_TTL : REPO_META_ERROR_TTL;
    if (Date.now() - cached.timestamp < ttl) return cached.meta;
  }

  const url = `https://api.github.com/repos/${repoName}`;
  let data: RepoResponse | null = null;

  // Authenticated REST first (classic PATs can read public org repos).
  // Unauthenticated fallback covers fine-grained tokens that cannot.
  try {
    data = await githubJsonPreferAuth<RepoResponse>(url, signal);
  } catch {
    data = null;
  }

  const ownerType = data?.owner?.type;
  const orgLogo = data?.owner?.avatar_url ?? "";
  const meta =
    data && orgLogo
      ? {
          stars: data.stargazers_count ?? 0,
          orgLogo,
          isOrg: ownerType === "Organization",
        }
      : null;

  repoMetaCache.set(repoName, { meta, timestamp: Date.now() });
  return meta;
}

function toContribution(
  item: SearchItem,
  metaByRepo: Map<string, RepoMeta | null>,
): Contribution | null {
  const repoName = repoFromSearchItem(item);
  if (!item.html_url || !item.title || !item.created_at || !repoName) {
    return null;
  }

  const isPr = item.pull_request != null;
  if (isPr && !item.pull_request?.merged_at) return null;

  const meta = metaByRepo.get(repoName);
  if (meta && !meta.isOrg) return null;

  const owner = repoName.split("/")[0];
  return {
    id: item.html_url,
    type: isPr ? "pr" : "issue",
    title: item.title,
    url: item.html_url,
    createdAt: item.created_at,
    commentCount: item.comments ?? 0,
    repoName,
    repoStars: meta?.stars ?? 0,
    orgLogo: meta?.orgLogo || `https://github.com/${owner}.png`,
  };
}

async function fetchContributions(): Promise<Contribution[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const prQuery = `author:${GH_USERNAME} -user:${GH_USERNAME} is:pr is:merged`;
    const issueQuery = `author:${GH_USERNAME} -user:${GH_USERNAME} is:issue`;

    const [prItems, issueItems] = await Promise.all([
      searchIssues(prQuery, controller.signal),
      searchIssues(issueQuery, controller.signal),
    ]);

    const byId = new Map<string, SearchItem>();
    for (const item of [...prItems, ...issueItems]) {
      if (item.html_url && !byId.has(item.html_url)) byId.set(item.html_url, item);
    }

    const repoNames = [
      ...new Set(
        [...byId.values()]
          .map(repoFromSearchItem)
          .filter((name): name is string => !!name),
      ),
    ];

    const metaEntries = await Promise.all(
      repoNames.map(
        async (name) =>
          [name, await fetchRepoMeta(name, controller.signal)] as const,
      ),
    );
    const metaByRepo = new Map(metaEntries);

    const contributions = [...byId.values()]
      .map((item) => toContribution(item, metaByRepo))
      .filter((c): c is Contribution => c !== null)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    if (
      cachedData &&
      cachedData.length > 0 &&
      contributions.length < Math.max(1, Math.ceil(cachedData.length * 0.5))
    ) {
      lastFetchTime = Date.now();
      return cachedData;
    }

    cachedData = contributions;
    lastFetchTime = Date.now();
    return contributions;
  } finally {
    clearTimeout(timeoutId);
  }
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
  void run.catch(() => {}).finally(() => {
    if (pendingRequest === run) pendingRequest = null;
  });

  try {
    const data = await run;
    return respond(data, "MISS", lastFetchTime);
  } catch {
    if (cachedData) {
      return respond(cachedData, "STALE", lastFetchTime);
    }

    return jsonResponse(
      { error: "Failed to fetch OSS contributions" },
      { status: 503, cacheStatus: "ERROR", fetchedAt: 0, cdn: "stale" },
    );
  }
};
