import { getPersistentEntry, setPersistentCache } from "./persistentCache";

export interface LiveSnapshot<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
}

export interface LiveResourceOptions<T> {
  key: string;
  url: string;
  validate: (data: unknown) => T;
  /** Skip a load while data is younger than this. Keep it below `pollMs`. */
  freshMs: number;
  pollMs: number;
  /**
   * Data older than this after a fetch is treated as a stale CDN/cache copy and
   * re-requested (bypassing the CDN). Must exceed the server's own max data age
   * or it fires on every load. Defaults to `freshMs`.
   */
  staleAfterMs?: number;
  maxAgeMs?: number;
  onFetch?: () => void;
}

const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const VISIBILITY_MIN_GAP_MS = 30_000;
const STALE_RETRY_MS = [2500, 8000] as const;

type Listener<T> = (snapshot: LiveSnapshot<T>) => void;

function buildApiUrl(path: string): string {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const slug = path.replace(/^\//, "");
  const apiPath = baseUrl.endsWith("/") ? slug : `/${slug}`;
  return `${baseUrl}${apiPath}`;
}

/**
 * When the server data was produced, expressed on the *client* clock.
 *
 * X-Fetched-At is a server timestamp, so comparing it to Date.now() breaks when
 * the visitor's clock is off (skipped polls / endless forced refetches). Instead
 * take the server-relative age (server "now" minus X-Fetched-At, both on the
 * server clock) and subtract it from the client's receive time. Server "now" is
 * `Date + Age`: on a CDN hit `Date` is the ORIGINAL generation time, not the
 * delivery time.
 */
function parseFetchedAt(response: Response, receivedAt: number): number {
  const raw = response.headers.get("X-Fetched-At");
  const fetched = raw == null || raw === "" ? NaN : Number(raw);
  if (!Number.isFinite(fetched) || fetched <= 0) return receivedAt;

  const dateMs = Date.parse(response.headers.get("Date") ?? "");
  if (!Number.isFinite(dateMs)) return Math.min(fetched, receivedAt);

  const ageSec = Number(response.headers.get("Age"));
  const serverNow = dateMs + (Number.isFinite(ageSec) ? ageSec * 1000 : 0);
  return receivedAt - Math.max(0, serverNow - fetched);
}

export function createLiveResource<T>(options: LiveResourceOptions<T>) {
  const {
    key,
    url,
    validate,
    freshMs,
    pollMs,
    maxAgeMs = DEFAULT_MAX_AGE_MS,
    onFetch,
  } = options;
  const staleAfterMs = options.staleAfterMs ?? freshMs;
  const href = buildApiUrl(url);

  const SERVER_SNAPSHOT: LiveSnapshot<T> = Object.freeze({
    data: null,
    loading: true,
    error: null,
    fetchedAt: null,
  });
  let data: T | null = null;
  let fetchedAt = 0;
  let diskBooted = false;
  let inflight: Promise<T> | null = null;
  let snapshot: LiveSnapshot<T> = SERVER_SNAPSHOT;

  function bootFromDisk() {
    if (diskBooted || typeof window === "undefined") return;
    diskBooted = true;
    const disk = getPersistentEntry<T>(key, maxAgeMs);
    if (!disk) return;
    data = disk.data;
    fetchedAt = disk.timestamp;
    snapshot = { data, loading: false, error: null, fetchedAt };
  }

  const listeners = new Set<Listener<T>>();
  let liveRefreshStarted = false;
  let lastPollAt = 0;
  let intervalId: number | null = null;
  let staleRetryIndex = 0;
  let staleRetryTimer: number | null = null;

  function emit() {
    for (const listener of listeners) listener(snapshot);
  }

  function setSnapshot(patch: Partial<LiveSnapshot<T>>) {
    snapshot = { ...snapshot, ...patch };
    emit();
  }

  function clearStaleRetry() {
    if (staleRetryTimer !== null && typeof window !== "undefined") {
      window.clearTimeout(staleRetryTimer);
    }
    staleRetryTimer = null;
  }

  function noteFetchedAt(at: number) {
    if (Date.now() - at < staleAfterMs) {
      staleRetryIndex = 0;
      clearStaleRetry();
      return;
    }
    if (typeof window === "undefined") return;
    if (staleRetryIndex >= STALE_RETRY_MS.length) return;
    if (staleRetryTimer !== null) return;

    const delay =
      staleRetryIndex === 0
        ? STALE_RETRY_MS[0]
        : STALE_RETRY_MS[1] - STALE_RETRY_MS[0];
    staleRetryIndex += 1;
    staleRetryTimer = window.setTimeout(() => {
      staleRetryTimer = null;
      void load({ force: true, cache: "no-cache", bypassCdn: true }).catch(() => {});
    }, delay);
  }

  function read(): T | null {
    bootFromDisk();
    return data;
  }

  async function load(opts?: {
    force?: boolean;
    cache?: RequestCache;
    bypassCdn?: boolean;
  }): Promise<T> {
    const force = opts?.force === true;
    const now = Date.now();

    if (!force && data !== null && now - fetchedAt < freshMs) return data;
    if (inflight) return inflight;

    onFetch?.();

    inflight = (async () => {
      const fetchUrl = opts?.bypassCdn
        ? `${href}${href.includes("?") ? "&" : "?"}_=${Date.now()}`
        : href;
      const response = await fetch(fetchUrl, {
        headers: { Accept: "application/json" },
        cache: opts?.cache,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const parsed = validate(await response.json());
      const at = parseFetchedAt(response, Date.now());
      data = parsed;
      fetchedAt = at;
      setPersistentCache(key, parsed, at);
      noteFetchedAt(at);
      setSnapshot({ data: parsed, loading: false, error: null, fetchedAt: at });
      return parsed;
    })();

    try {
      return await inflight;
    } finally {
      inflight = null;
    }
  }

  async function revalidate(silent: boolean): Promise<T> {
    if (!silent || data === null) {
      setSnapshot({ loading: data === null, error: null });
    }

    try {
      return await load();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load resource";
      if (data !== null) {
        setSnapshot({ data, loading: false, error: null });
        return data;
      }
      setSnapshot({ data: null, loading: false, error: message, fetchedAt: null });
      throw err;
    }
  }

  function poll(minGapMs: number) {
    const now = Date.now();
    if (minGapMs > 0 && now - lastPollAt < minGapMs) return;
    lastPollAt = now;
    void revalidate(true).catch(() => {});
  }

  function onVisibility() {
    if (document.visibilityState !== "visible") return;
    poll(VISIBILITY_MIN_GAP_MS);
  }

  function startLiveRefresh() {
    if (liveRefreshStarted || typeof window === "undefined") return;
    liveRefreshStarted = true;
    intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") poll(0);
    }, pollMs);
    document.addEventListener("visibilitychange", onVisibility);
  }

  function stopLiveRefresh() {
    if (!liveRefreshStarted) return;
    liveRefreshStarted = false;
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibility);
    }
    clearStaleRetry();
    staleRetryIndex = 0;
  }

  function subscribe(listener: Listener<T>): () => void {
    bootFromDisk();
    const isFirst = listeners.size === 0;
    listeners.add(listener);
    listener(snapshot);

    if (isFirst) {
      void revalidate(false).catch(() => {});
      startLiveRefresh();
    }

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) stopLiveRefresh();
    };
  }

  function getSnapshot(): LiveSnapshot<T> {
    // Do not boot localStorage here. React 19 compares getSnapshot() to
    // getServerSnapshot() during hydration; reading the cache would make
    // them differ and regenerate the tree.
    return snapshot;
  }

  function getServerSnapshot(): LiveSnapshot<T> {
    return SERVER_SNAPSHOT;
  }

  return { read, load, subscribe, getSnapshot, getServerSnapshot };
}
