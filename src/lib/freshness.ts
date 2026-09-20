/**
 * Freshness budget constants across server and client layers.
 *
 * Target: displayed music data <= ~5 min behind Last.fm (typical ~2–3 min).
 * Deliberately conservative: 2 min server TTLs keep Last.fm/function load low.
 * To trade load for freshness, lower the three server TTLs together (1 min
 * roughly halves typical lag) and CLIENT_STALE_MS with them.
 * - Last.fm ingestion lag: ~1–2 min (unavoidable, healed on next overlap cycle)
 * - Server timeline TTL: 120s (delta fetch of recent tracks)
 * - Server route cache: 120s (both music-stats and music-radial-heatmap)
 * - User stats (playcount) cache: 120s
 * - CDN edge cache (music profile): s-maxage=30, swr=30 (stale copy served at most ~60s)
 *
 * Client:
 * - POLL: how often a visible tab asks for fresh data.
 * - FRESH: skip a load while data is younger than this. MUST stay below POLL, or
 *   a poll that lands a moment early is skipped and the lag silently doubles.
 * - STALE: data older than this on arrival counts as an unusually old CDN copy
 *   and triggers (max 2) CDN-bypassing retries. Keep it at ~the server TTL:
 *   measured in simulation with 120s server TTLs, 120s adds ~0.07 req/min;
 *   75s fired on ~half of all loads (0.47 req/min extra); >=150s never fires.
 */

export const TIMELINE_TTL_MS = 120_000;
export const ROUTE_CACHE_MS = 120_000;
export const USER_STATS_TTL_MS = 120_000;
export const CLIENT_POLL_MS = 60_000;
export const CLIENT_FRESH_MS = 30_000;
export const CLIENT_STALE_MS = 120_000;
