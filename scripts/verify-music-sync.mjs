const USERNAME = process.env.LASTFM_USERNAME || "";
const API_KEY = process.env.LASTFM_API_KEY || "";
const STATS_URL =
  process.env.MUSIC_API_URL || "https://nikshaan.dev/api/music-stats";
const RADIAL_URL =
  process.env.RADIAL_API_URL ||
  STATS_URL.replace(/music-stats$/, "music-radial-heatmap");

if (!USERNAME || !API_KEY) {
  console.error("ERROR: LASTFM_USERNAME and LASTFM_API_KEY must be set");
  process.exit(1);
}

const GRACE_SEC = Number(process.env.SYNC_GRACE_SEC || 8 * 60);
const CHECK_DAYS = 3;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_PAGES = 10;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_SEC = 86_400;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function istDayStartSec(nowMs) {
  const ist = new Date(nowMs + IST_OFFSET_MS);
  const midnightUtc =
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) -
    IST_OFFSET_MS;
  return Math.floor(midnightUtc / 1000);
}

function istLabel(dayStartSec) {
  const d = new Date(dayStartSec * 1000 + IST_OFFSET_MS);
  return `${DAY_LABELS[d.getUTCDay()]} ${d.getUTCDate()}`;
}

async function fetchWithRetry(url, maxRetries = 3) {
  let lastError = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": "nikshaan-music-verify/1.0",
        },
      });
      clearTimeout(timeoutId);
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
    }
    if (attempt < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw new Error(`Max retries exceeded for ${url}: ${String(lastError)}`);
}

async function fetchApi(url) {
  const res = await fetchWithRetry(url);
  return {
    data: await res.json(),
    cacheStatus: res.headers.get("x-cache-status") || "?",
    fetchedAt: Number(res.headers.get("x-fetched-at")) || 0,
  };
}

async function fetchLastFmScrobbles(fromSec, toSec) {
  const out = [];
  let totalPages = 1;
  for (let page = 1; page <= totalPages && page <= MAX_PAGES; page++) {
    const url =
      `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks` +
      `&user=${encodeURIComponent(USERNAME)}&from=${fromSec}&to=${toSec}` +
      `&limit=200&page=${page}&api_key=${API_KEY}&format=json`;
    const json = await (await fetchWithRetry(url)).json();
    totalPages = parseInt(
      String(json?.recenttracks?.["@attr"]?.totalPages ?? "1"),
      10,
    );
    const raw = json?.recenttracks?.track;
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const t of list) {
      if (t?.["@attr"]?.nowplaying) continue;
      const ts = parseInt(t?.date?.uts, 10);
      const artist = String(t?.artist?.["#text"] ?? t?.artist?.name ?? "").trim();
      if (Number.isFinite(ts) && artist) out.push({ ts, artist });
    }
  }
  return out;
}

const nowMs = Date.now();
const nowSec = Math.floor(nowMs / 1000);
const cutoffSec = nowSec - GRACE_SEC;
const todayStart = istDayStartSec(nowMs);

const [stats, radial] = await Promise.all([
  fetchApi(STATS_URL),
  fetchApi(RADIAL_URL),
]);

const weekly = stats.data?.weeklyScrobbles;
if (!Array.isArray(weekly) || weekly.length === 0) {
  throw new Error("music-stats: missing weeklyScrobbles");
}
const weeks = radial.data?.weeks;
const radialArtists = radial.data?.artists;
if (!Array.isArray(weeks) || !weeks.length || !Array.isArray(radialArtists)) {
  throw new Error("music-radial-heatmap: missing weeks/artists");
}
const currentWeek = weeks[weeks.length - 1];

const fromSec = Math.min(
  todayStart - (CHECK_DAYS - 1) * DAY_SEC,
  currentWeek.from,
);
const scrobbles = await fetchLastFmScrobbles(fromSec, cutoffSec);

console.log(
  `stats:  cache=${stats.cacheStatus} fetchedAt=${
    stats.fetchedAt ? new Date(stats.fetchedAt).toISOString() : "?"
  }`,
);
console.log(
  `radial: cache=${radial.cacheStatus} fetchedAt=${
    radial.fetchedAt ? new Date(radial.fetchedAt).toISOString() : "?"
  }`,
);
console.log(
  `Last.fm scrobbles considered: ${scrobbles.length} (older than ${Math.round(
    GRACE_SEC / 60,
  )} min)`,
);

const errors = [];

const apiByLabel = new Map(weekly.map((d) => [d?.name, d?.scrobbles ?? 0]));
for (let i = 0; i < CHECK_DAYS; i++) {
  const dayStart = todayStart - i * DAY_SEC;
  const label = istLabel(dayStart);
  const expected = scrobbles.filter(
    (s) => s.ts >= dayStart && s.ts < dayStart + DAY_SEC,
  ).length;
  if (!apiByLabel.has(label)) {
    console.log(`stats ${label}: not in API window yet, skipped`);
    continue;
  }
  const actual = apiByLabel.get(label);
  console.log(`stats ${label}: Last.fm ${expected} | API ${actual}`);
  if (actual < expected) {
    errors.push(
      `music-stats ${label}: API has ${actual}, Last.fm has ${expected} (lag ${expected - actual})`,
    );
  }
}

const expectedByArtist = new Map();
for (const s of scrobbles) {
  if (s.ts < currentWeek.from || s.ts > currentWeek.to) continue;
  const key = s.artist.toLowerCase();
  expectedByArtist.set(key, (expectedByArtist.get(key) ?? 0) + 1);
}
for (const artist of radialArtists) {
  const plays = artist?.plays;
  if (!Array.isArray(plays)) continue;
  const actual = plays[plays.length - 1] ?? 0;
  const expected = expectedByArtist.get(String(artist.name).toLowerCase()) ?? 0;
  if (actual < expected) {
    errors.push(
      `radial "${artist.name}": API has ${actual} this week, Last.fm has ${expected}`,
    );
  }
}
console.log(
  `radial: checked ${radialArtists.length} artists against current week`,
);

if (errors.length > 0) {
  for (const err of errors) console.error(`ERROR: ${err}`);
  process.exit(1);
}

console.log("Music stats and radial heatmap are in sync with Last.fm.");
