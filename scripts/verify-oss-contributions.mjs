/**
 * Independently rebuild the expected org PR + issue list from GitHub Search
 * and compare it to /api/oss-contributions. Used by Warm API CI.
 */
import { spawnSync } from "node:child_process";

const USERNAME = process.env.GH_USERNAME || "Nikshaan";
const API_URL =
  process.env.OSS_API_URL || "https://nikshaan.dev/api/oss-contributions";
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";

const SEARCH_PAGE_SIZE = 100;
const MAX_PAGES = 5;

function githubHeaders(auth) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "nikshaan-oss-verify",
  };
  if (auth && TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  return headers;
}

async function fetchGithub(url, auth) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: githubHeaders(auth),
  });
  const body = await response.text();
  let data = null;
  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const detail =
      data && typeof data.message === "string" ? data.message : body.slice(0, 160);
    throw new Error(`GitHub HTTP ${response.status} for ${url}: ${detail}`);
  }
  return data;
}

function ghApi(url) {
  const path = url.replace("https://api.github.com/", "");
  const result = spawnSync("gh", ["api", path], {
    encoding: "utf8",
    timeout: 30_000,
  });
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").slice(0, 200);
    throw new Error(`gh api failed for ${path}: ${err}`);
  }
  return JSON.parse(result.stdout);
}

async function githubJson(url) {
  if (TOKEN) {
    try {
      return await fetchGithub(url, true);
    } catch (err) {
      try {
        return ghApi(url);
      } catch {
        throw err;
      }
    }
  }
  try {
    return ghApi(url);
  } catch {
    return fetchGithub(url, false);
  }
}

async function searchIssues(query) {
  const items = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;
  while (page <= MAX_PAGES && items.length < total) {
    const params = new URLSearchParams({
      q: query,
      sort: "updated",
      order: "desc",
      per_page: String(SEARCH_PAGE_SIZE),
      page: String(page),
    });
    const data = await githubJson(
      `https://api.github.com/search/issues?${params}`,
    );
    const batch = Array.isArray(data.items) ? data.items : [];
    total = typeof data.total_count === "number" ? data.total_count : batch.length;
    items.push(...batch);
    if (batch.length < SEARCH_PAGE_SIZE) break;
    page += 1;
  }
  return items;
}

function repoNameFromItem(item) {
  const url = item.repository_url || "";
  const marker = "/repos/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const name = url.slice(index + marker.length).replace(/\/+$/, "");
  return name.includes("/") ? name : null;
}

async function isOrgRepo(repoName, cache) {
  if (cache.has(repoName)) return cache.get(repoName);
  const data = await githubJson(`https://api.github.com/repos/${repoName}`);
  const isOrg = data?.owner?.type === "Organization";
  cache.set(repoName, isOrg);
  return isOrg;
}

async function expectedOrgContributions() {
  const [prItems, issueItems] = await Promise.all([
    searchIssues(`author:${USERNAME} -user:${USERNAME} is:pr is:merged`),
    searchIssues(`author:${USERNAME} -user:${USERNAME} is:issue`),
  ]);

  const byUrl = new Map();
  for (const item of [...prItems, ...issueItems]) {
    if (item.html_url && !byUrl.has(item.html_url)) byUrl.set(item.html_url, item);
  }

  const orgCache = new Map();
  const expected = [];
  for (const item of byUrl.values()) {
    const repoName = repoNameFromItem(item);
    if (!repoName || !item.html_url || !item.title) continue;
    const isPr = item.pull_request != null;
    if (isPr && !item.pull_request?.merged_at) continue;
    if (!(await isOrgRepo(repoName, orgCache))) continue;
    expected.push({
      url: item.html_url,
      type: isPr ? "pr" : "issue",
      repoName,
      title: item.title,
      createdAt: item.created_at,
    });
  }

  expected.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return expected;
}

async function fetchLiveOss() {
  const response = await fetch(API_URL, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const cacheStatus = response.headers.get("x-cache-status");
  const fetchedAt = response.headers.get("x-fetched-at");
  if (!response.ok) {
    throw new Error(`${API_URL} HTTP ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error(`${API_URL} did not return a JSON array`);
  }
  return { data, cacheStatus, fetchedAt };
}

const expected = await expectedOrgContributions();
const live = await fetchLiveOss();
const liveUrls = new Set(live.data.map((item) => item.url));
const missing = expected.filter((item) => !liveUrls.has(item.url));
const extra = live.data.filter(
  (item) => !expected.some((exp) => exp.url === item.url),
);
const liveTypes = live.data.reduce((acc, item) => {
  acc[item.type] = (acc[item.type] || 0) + 1;
  return acc;
}, {});
const expectedTypes = expected.reduce((acc, item) => {
  acc[item.type] = (acc[item.type] || 0) + 1;
  return acc;
}, {});

console.log(`API ${API_URL}`);
console.log(`cache ${live.cacheStatus || "?"} fetchedAt ${live.fetchedAt || "?"}`);
console.log(
  `GitHub source of truth: ${expected.length} org contributions (${expectedTypes.pr || 0} PRs, ${expectedTypes.issue || 0} issues)`,
);
console.log(
  `Live API: ${live.data.length} (${liveTypes.pr || 0} PRs, ${liveTypes.issue || 0} issues)`,
);
if (expected[0]) {
  console.log(`Newest GitHub: ${expected[0].createdAt} ${expected[0].url}`);
}
if (live.data[0]) {
  console.log(`Newest live:   ${live.data[0].createdAt} ${live.data[0].url}`);
}

const errors = [];
if (expected.length === 0) {
  errors.push("GitHub search returned no organization PRs or issues");
}
if ((expectedTypes.pr || 0) > 0 && (liveTypes.pr || 0) === 0) {
  errors.push("Live API has no pull requests");
}
if ((expectedTypes.issue || 0) > 0 && (liveTypes.issue || 0) === 0) {
  errors.push("Live API has no issues");
}
if (missing.length) {
  errors.push(
    `Live API missing ${missing.length} GitHub org contribution(s): ${missing
      .slice(0, 8)
      .map((item) => item.url)
      .join(", ")}`,
  );
}
if (extra.length) {
  console.log(
    `Note: live API has ${extra.length} extra item(s) not in the current search snapshot`,
  );
}

if (errors.length) {
  for (const message of errors) console.error(`ERROR: ${message}`);
  process.exit(1);
}

console.log("OSS contributions match GitHub (org PRs + issues).");
