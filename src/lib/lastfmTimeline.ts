export interface Scrobble {
  ts: number;
  artist: string;
}

export interface Timeline {
  scrobbles: Scrobble[];
  fromSec: number;
  toSec: number;
  fetchedAt: number;
}

const PAGE_SIZE = 500;
const MAX_PAGES = 40;
const REQUEST_TIMEOUT_MS = 8000;

export const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_WEEK = 604_800;
export const ROLLING_DAYS = 365;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithRetry(
  url: string,
  maxRetries = 3,
): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "AstroPortfolio/1.0" },
      });
      clearTimeout(timeoutId);

      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get("Retry-After") || "3",
          10,
        );
        await sleep(retryAfter * 1000);
        continue;
      }
      if (response.ok) return response;
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`HTTP ${response.status}`);
      }
      lastError = new Error(`Unexpected HTTP status ${response.status}`);
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      if (attempt === maxRetries - 1) break;
    }

    await sleep(Math.min(1000 * Math.pow(2, attempt), 4000));
  }

  throw new Error(`Max retries exceeded for ${url}: ${String(lastError)}`);
}

function recentTracksUrl(
  username: string,
  apiKey: string,
  fromSec: number,
  toSec: number,
  limit: number,
  page: number,
): string {
  return (
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks` +
    `&user=${encodeURIComponent(username)}&from=${fromSec}&to=${toSec}` +
    `&limit=${limit}&page=${page}&api_key=${apiKey}&format=json`
  );
}

function parseTracks(raw: unknown, nowSec: number): Scrobble[] {
  const root = raw as {
    recenttracks?: { track?: unknown };
  } | null;
  const list = root?.recenttracks?.track;
  const arr = Array.isArray(list) ? list : list ? [list] : [];

  const out: Scrobble[] = [];
  for (const t of arr as {
    date?: { uts?: string };
    artist?: { "#text"?: string; name?: string };
  }[]) {
    const name = (t?.artist?.["#text"] ?? t?.artist?.name ?? "").trim();
    if (!name) continue;
    const uts = t?.date?.uts;
    const ts = uts ? parseInt(uts, 10) : nowSec;
    if (!Number.isFinite(ts)) continue;
    out.push({ ts, artist: name });
  }
  return out;
}

async function fetchTimelineUncached(
  username: string,
  apiKey: string,
  fromSec: number,
  toSec: number,
): Promise<Timeline> {
  const nowSec = Math.floor(Date.now() / 1000);

  const probe = await fetchWithRetry(
    recentTracksUrl(username, apiKey, fromSec, toSec, 1, 1),
  );
  const probeJson = await probe.json();
  const total = parseInt(
    String(probeJson?.recenttracks?.["@attr"]?.total ?? "0"),
    10,
  );

  if (!Number.isFinite(total) || total <= 0) {
    return { scrobbles: [], fromSec, toSec, fetchedAt: Date.now() };
  }

  const pages = Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES);
  const responses = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      fetchWithRetry(
        recentTracksUrl(username, apiKey, fromSec, toSec, PAGE_SIZE, i + 1),
      )
        .then((r) => r.json())
        .catch(() => null),
    ),
  );

  const scrobbles: Scrobble[] = [];
  for (const json of responses) {
    if (!json) continue;
    scrobbles.push(...parseTracks(json, nowSec));
  }

  scrobbles.sort((a, b) => a.ts - b.ts);
  return { scrobbles, fromSec, toSec, fetchedAt: Date.now() };
}

const TIMELINE_CACHE_MS = 90 * 1000;
const ANCHOR_TOLERANCE_SEC = 300;

let timelineCache: Timeline | null = null;
let timelinePending: Promise<Timeline> | null = null;

export function peekTimeline(): Timeline | null {
  return timelineCache;
}

export async function getTimeline(
  username: string,
  apiKey: string,
  anchorSec: number,
  options?: { force?: boolean },
): Promise<Timeline> {
  const force = options?.force === true;
  const fromSec = anchorSec - ROLLING_DAYS * SECONDS_PER_DAY;
  const now = Date.now();

  if (
    !force &&
    timelineCache &&
    now - timelineCache.fetchedAt < TIMELINE_CACHE_MS &&
    Math.abs(timelineCache.toSec - anchorSec) <= ANCHOR_TOLERANCE_SEC
  ) {
    return timelineCache;
  }

  if (timelinePending) return timelinePending;

  const run = fetchTimelineUncached(username, apiKey, fromSec, anchorSec).then(
    (t) => {
      timelineCache = t;
      return t;
    },
  );
  timelinePending = run;
  void run.catch(() => {}).finally(() => {
    if (timelinePending === run) timelinePending = null;
  });

  try {
    return await run;
  } catch (err) {
    if (timelineCache) return timelineCache;
    throw err;
  }
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function istParts(ms: number) {
  const ist = new Date(ms + IST_OFFSET_MS);
  return {
    year: ist.getUTCFullYear(),
    month: ist.getUTCMonth(),
    date: ist.getUTCDate(),
  };
}

function istMidnightUtcMs(p: { year: number; month: number; date: number }) {
  return Date.UTC(p.year, p.month, p.date) - IST_OFFSET_MS;
}

function toIstDateString(ms: number): string {
  const { year, month, date } = istParts(ms);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
}

export interface DailyScrobble {
  name: string;
  scrobbles: number;
}

export function dailyBuckets(
  timeline: Timeline,
  days: number,
  nowMs: number,
): DailyScrobble[] {
  const todayStart = istMidnightUtcMs(istParts(nowMs));
  const counts = new Map<string, number>();
  for (const s of timeline.scrobbles) {
    const key = toIstDateString(s.ts * 1000);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const out: DailyScrobble[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = todayStart - i * DAY_MS;
    const d = new Date(dayStart + IST_OFFSET_MS);
    const label = `${DAY_LABELS[d.getUTCDay()]} ${d.getUTCDate()}`;
    out.push({
      name: label,
      scrobbles: counts.get(toIstDateString(dayStart)) ?? 0,
    });
  }
  return out;
}

export function listeningStreak(timeline: Timeline, nowMs: number): number {
  const days = new Set<string>();
  for (const s of timeline.scrobbles) days.add(toIstDateString(s.ts * 1000));

  const todayStart = istMidnightUtcMs(istParts(nowMs));
  let streak = days.has(toIstDateString(todayStart)) ? 1 : 0;

  for (let i = 1; ; i++) {
    const dayStart = todayStart - i * DAY_MS;
    if (dayStart < timeline.fromSec * 1000) break;
    if (!days.has(toIstDateString(dayStart))) break;
    streak++;
  }
  return streak;
}

export interface ArtistCount {
  name: string;
  plays: number;
}

export function topArtists(
  timeline: Timeline,
  sinceSec: number,
  limit: number,
): ArtistCount[] {
  const counts = new Map<string, number>();
  const labels = new Map<string, string>();

  for (const s of timeline.scrobbles) {
    if (s.ts < sinceSec) continue;
    const key = s.artist.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!labels.has(key)) labels.set(key, s.artist);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, plays]) => ({ name: labels.get(key) ?? key, plays }));
}

export interface HeatmapWeek {
  from: number;
  to: number;
}

export function rollingWeeks(anchorSec: number, count: number): HeatmapWeek[] {
  const weeks: HeatmapWeek[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const to = anchorSec - i * SECONDS_PER_WEEK;
    weeks.push({ from: to - SECONDS_PER_WEEK + 1, to });
  }
  return weeks;
}

export function weeklyPlayMatrix(
  timeline: Timeline,
  weeks: HeatmapWeek[],
  artists: ArtistCount[],
): number[][] {
  const rowByKey = new Map<string, number[]>();
  const keys = artists.map((a) => a.name.toLowerCase());
  keys.forEach((k) => rowByKey.set(k, new Array(weeks.length).fill(0)));

  if (!weeks.length) return keys.map((k) => rowByKey.get(k)!);

  const first = weeks[0].from;
  for (const s of timeline.scrobbles) {
    const row = rowByKey.get(s.artist.toLowerCase());
    if (!row) continue;
    if (s.ts < first) continue;
    const ix = Math.floor((s.ts - first) / SECONDS_PER_WEEK);
    if (ix >= 0 && ix < weeks.length) row[ix] += 1;
  }

  return keys.map((k) => rowByKey.get(k)!);
}
