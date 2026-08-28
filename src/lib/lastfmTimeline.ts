import snapshotData from "../generated/lastfmSnapshot.json";

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

interface SnapshotFile {
  artists: string[];
  scrobbles: [number, number][];
  fromSec: number;
  toSec: number;
  generatedAt: number;
}

const snapshot = snapshotData as SnapshotFile;

const PAGE_SIZE = 500;
const MAX_PAGES = 40;
const FETCH_CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_RATE_LIMIT_RETRIES = 3;
const MAX_RATE_LIMIT_WAIT_MS = 15_000;

export const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_WEEK = 604_800;
export const ROLLING_DAYS = 365;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

export async function fetchWithRetry(
  url: string,
  maxRetries = 3,
): Promise<Response> {
  let lastError: unknown = null;
  let rateLimitRetries = 0;
  let rateLimitWaitMs = 0;

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
        if (
          rateLimitRetries >= MAX_RATE_LIMIT_RETRIES ||
          rateLimitWaitMs >= MAX_RATE_LIMIT_WAIT_MS
        ) {
          throw new Error("HTTP 429: rate limit retry budget exhausted");
        }
        const retryAfterSec = parseInt(
          response.headers.get("Retry-After") || "3",
          10,
        );
        const waitMs = Math.min(
          retryAfterSec * 1000,
          MAX_RATE_LIMIT_WAIT_MS - rateLimitWaitMs,
        );
        rateLimitRetries++;
        rateLimitWaitMs += waitMs;
        await sleep(waitMs);
        attempt--;
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

function parseTracks(raw: unknown): Scrobble[] {
  const root = raw as {
    recenttracks?: { track?: unknown };
  } | null;
  const list = root?.recenttracks?.track;
  const arr = Array.isArray(list) ? list : list ? [list] : [];

  const out: Scrobble[] = [];
  for (const t of arr as {
    "@attr"?: { nowplaying?: string };
    date?: { uts?: string };
    artist?: { "#text"?: string; name?: string };
  }[]) {
    if (t?.["@attr"]?.nowplaying) continue;
    const name = (t?.artist?.["#text"] ?? t?.artist?.name ?? "").trim();
    const uts = t?.date?.uts;
    if (!name || !uts) continue;
    const ts = parseInt(uts, 10);
    if (!Number.isFinite(ts)) continue;
    out.push({ ts, artist: name });
  }
  return out;
}

async function fetchRangeOrThrow(
  username: string,
  apiKey: string,
  fromSec: number,
  toSec: number,
): Promise<Scrobble[]> {
  const probe = await fetchWithRetry(
    recentTracksUrl(username, apiKey, fromSec, toSec, 1, 1),
  );
  const probeJson = await probe.json();
  const total = parseInt(
    String(probeJson?.recenttracks?.["@attr"]?.total ?? "0"),
    10,
  );

  if (!Number.isFinite(total) || total <= 0) return [];

  const pages = Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES);
  const pageNumbers = Array.from({ length: pages }, (_, i) => i + 1);
  const responses = await mapWithConcurrency(
    pageNumbers,
    FETCH_CONCURRENCY,
    (page) =>
      fetchWithRetry(
        recentTracksUrl(username, apiKey, fromSec, toSec, PAGE_SIZE, page),
      ).then((r) => r.json()),
  );

  const scrobbles: Scrobble[] = [];
  for (const json of responses) scrobbles.push(...parseTracks(json));
  scrobbles.sort((a, b) => a.ts - b.ts);
  return scrobbles;
}

interface TimelineState {
  scrobbles: Scrobble[];
  coveredToSec: number;
  fetchedAt: number;
}

function decodeSnapshot(): TimelineState {
  const scrobbles: Scrobble[] = snapshot.scrobbles.map(([ts, idx]) => ({
    ts,
    artist: snapshot.artists[idx] ?? "",
  }));
  return { scrobbles, coveredToSec: snapshot.toSec, fetchedAt: 0 };
}

function pruneOld(scrobbles: Scrobble[], cutoffSec: number): Scrobble[] {
  let start = 0;
  while (start < scrobbles.length && scrobbles[start].ts < cutoffSec) start++;
  return start === 0 ? scrobbles : scrobbles.slice(start);
}

function toTimeline(s: TimelineState, anchorSec: number): Timeline {
  return {
    scrobbles: s.scrobbles,
    fromSec: anchorSec - ROLLING_DAYS * SECONDS_PER_DAY,
    toSec: s.coveredToSec,
    fetchedAt: s.fetchedAt,
  };
}

async function refresh(
  username: string,
  apiKey: string,
  anchorSec: number,
  base: TimelineState,
): Promise<TimelineState> {
  const cutoffSec = anchorSec - ROLLING_DAYS * SECONDS_PER_DAY;
  const needsFullFetch = base.coveredToSec <= 0 || base.coveredToSec < cutoffSec;
  const fromSec = needsFullFetch ? cutoffSec : base.coveredToSec + 1;

  if (fromSec > anchorSec) {
    return {
      scrobbles: pruneOld(base.scrobbles, cutoffSec),
      coveredToSec: base.coveredToSec,
      fetchedAt: Date.now(),
    };
  }

  const delta = await fetchRangeOrThrow(username, apiKey, fromSec, anchorSec);
  const merged = needsFullFetch
    ? delta
    : pruneOld(base.scrobbles, cutoffSec).concat(delta);

  return { scrobbles: merged, coveredToSec: anchorSec, fetchedAt: Date.now() };
}

const TIMELINE_TTL_MS = 30 * 1000;

let state: TimelineState | null = null;
let pending: Promise<TimelineState> | null = null;

export function peekTimeline(): Timeline | null {
  if (!state) return null;
  return toTimeline(state, state.coveredToSec);
}

export async function getTimeline(
  username: string,
  apiKey: string,
  anchorSec: number,
  options?: { force?: boolean },
): Promise<Timeline> {
  const force = options?.force === true;
  if (!state) state = decodeSnapshot();

  const now = Date.now();
  if (!force && now - state.fetchedAt < TIMELINE_TTL_MS) {
    return toTimeline(state, anchorSec);
  }

  if (pending) {
    try {
      return toTimeline(await pending, anchorSec);
    } catch {
      return toTimeline(state, anchorSec);
    }
  }

  const base = state;
  const run = refresh(username, apiKey, anchorSec, base).then((s) => {
    state = s;
    return s;
  });
  pending = run;
  void run.catch(() => {}).finally(() => {
    if (pending === run) pending = null;
  });

  try {
    return toTimeline(await run, anchorSec);
  } catch (err) {
    if (state) return toTimeline(state, anchorSec);
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

export function istDayStartSec(nowMs: number): number {
  return Math.floor(istMidnightUtcMs(istParts(nowMs)) / 1000);
}

export function istDayEndSec(nowMs: number): number {
  return istDayStartSec(nowMs) + SECONDS_PER_DAY - 1;
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

export function calendarWeeks(nowMs: number, count: number): HeatmapWeek[] {
  const istDate = new Date(nowMs + IST_OFFSET_MS);
  const day = istDate.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const currentMonStartSec =
    istDayStartSec(nowMs) - daysSinceMonday * SECONDS_PER_DAY;

  const weeks: HeatmapWeek[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const from = currentMonStartSec - i * SECONDS_PER_WEEK;
    const to = from + SECONDS_PER_WEEK - 1;
    weeks.push({ from, to });
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
