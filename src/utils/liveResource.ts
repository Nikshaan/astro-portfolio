import { getPersistentEntry, setPersistentCache } from "./persistentCache";

export interface LiveSnapshot<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface LiveResourceOptions<T> {
  key: string;
  url: string;
  validate: (data: unknown) => T;
  freshMs: number;
  pollMs: number;
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

function parseFetchedAt(response: Response): number {
  const raw = response.headers.get("X-Fetched-At");
  if (raw == null || raw === "") return Date.now();
  const n = Number(raw);
  return Number.isFinite(n) ? n : Date.now();
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
  const href = buildApiUrl(url);

  const boot =
    typeof window !== "undefined" ? getPersistentEntry<T>(key, maxAgeMs) : null;
  let data: T | null = boot ? boot.data : null;
  let fetchedAt = boot ? boot.timestamp : 0;
  let inflight: Promise<T> | null = null;
  let snapshot: LiveSnapshot<T> = {
    data,
    loading: data === null,
    error: null,
  };

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
    if (Date.now() - at < freshMs) {
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
      void load({ force: true, cache: "no-cache" }).catch(() => {});
    }, delay);
  }

  function read(): T | null {
    if (data !== null) return data;
    const disk = getPersistentEntry<T>(key, maxAgeMs);
    if (disk) {
      data = disk.data;
      fetchedAt = disk.timestamp;
      snapshot = { ...snapshot, data, loading: false };
      return data;
    }
    return null;
  }

  async function load(opts?: {
    force?: boolean;
    cache?: RequestCache;
  }): Promise<T> {
    const force = opts?.force === true;
    const now = Date.now();

    if (!force && data !== null && now - fetchedAt < freshMs) return data;
    if (inflight) return inflight;

    onFetch?.();

    inflight = (async () => {
      const response = await fetch(href, {
        headers: { Accept: "application/json" },
        cache: opts?.cache,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const parsed = validate(await response.json());
      const at = parseFetchedAt(response);
      data = parsed;
      fetchedAt = at;
      setPersistentCache(key, parsed, at);
      noteFetchedAt(at);
      setSnapshot({ data: parsed, loading: false, error: null });
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
      setSnapshot({ data: null, loading: false, error: message });
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
    return snapshot;
  }

  return { read, load, subscribe, getSnapshot };
}
