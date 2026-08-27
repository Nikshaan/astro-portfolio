import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "generated");
const OUT_FILE = join(OUT_DIR, "lastfmSnapshot.json");

const PAGE_SIZE = 500;
const MAX_PAGES = 40;
const CONCURRENCY = 4;
const ROLLING_DAYS = 365;
const REQUEST_TIMEOUT_MS = 8000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function fetchWithRetry(url, maxRetries = 3) {
  let lastError = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "AstroPortfolio/1.0" },
      });
      clearTimeout(timeoutId);
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "3", 10);
        await sleep(retryAfter * 1000);
        continue;
      }
      if (response.ok) return response;
      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      if (attempt === maxRetries - 1) break;
    }
    await sleep(Math.min(1000 * 2 ** attempt, 4000));
  }
  throw new Error(`Max retries exceeded for ${url}: ${String(lastError)}`);
}

function recentTracksUrl(username, apiKey, fromSec, toSec, limit, page) {
  return (
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks` +
    `&user=${encodeURIComponent(username)}&from=${fromSec}&to=${toSec}` +
    `&limit=${limit}&page=${page}&api_key=${apiKey}&format=json`
  );
}

function parseTracks(raw) {
  const list = raw?.recenttracks?.track;
  const arr = Array.isArray(list) ? list : list ? [list] : [];
  const out = [];
  for (const t of arr) {
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

function writeSnapshot(scrobbles, fromSec, toSec) {
  const artistIndex = new Map();
  const artists = [];
  const encoded = [];
  for (const { ts, artist } of scrobbles) {
    let idx = artistIndex.get(artist);
    if (idx === undefined) {
      idx = artists.length;
      artistIndex.set(artist, idx);
      artists.push(artist);
    }
    encoded.push([ts, idx]);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    OUT_FILE,
    JSON.stringify({ artists, scrobbles: encoded, fromSec, toSec, generatedAt: Date.now() }),
  );
}

async function main() {
  const username = process.env.LASTFM_USERNAME;
  const apiKey = process.env.LASTFM_API_KEY;

  if (!username || !apiKey) {
    console.warn("[lastfm-snapshot] LASTFM_USERNAME/LASTFM_API_KEY not set, writing empty snapshot");
    writeSnapshot([], 0, 0);
    return;
  }

  const toSec = Math.floor(Date.now() / 1000);
  const fromSec = toSec - ROLLING_DAYS * 86_400;

  try {
    const probe = await fetchWithRetry(recentTracksUrl(username, apiKey, fromSec, toSec, 1, 1));
    const probeJson = await probe.json();
    const total = parseInt(String(probeJson?.recenttracks?.["@attr"]?.total ?? "0"), 10);

    if (!Number.isFinite(total) || total <= 0) {
      writeSnapshot([], fromSec, toSec);
      console.log("[lastfm-snapshot] no scrobbles in range, wrote empty snapshot");
      return;
    }

    const pages = Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES);
    const pageNumbers = Array.from({ length: pages }, (_, i) => i + 1);
    const responses = await mapWithConcurrency(pageNumbers, CONCURRENCY, async (page) => {
      const res = await fetchWithRetry(
        recentTracksUrl(username, apiKey, fromSec, toSec, PAGE_SIZE, page),
      );
      return res.json();
    });

    const scrobbles = [];
    for (const json of responses) scrobbles.push(...parseTracks(json));
    scrobbles.sort((a, b) => a.ts - b.ts);

    writeSnapshot(scrobbles, fromSec, toSec);
    console.log(`[lastfm-snapshot] wrote ${scrobbles.length} scrobbles`);
  } catch (err) {
    console.warn(`[lastfm-snapshot] fetch failed, writing empty snapshot: ${String(err)}`);
    writeSnapshot([], 0, 0);
  }
}

await main();
