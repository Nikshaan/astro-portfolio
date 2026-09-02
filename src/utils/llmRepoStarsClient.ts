const CLIENT_CACHE_MS = 30 * 60 * 1000;
const POLL_MS = 30 * 60 * 1000;

let inflight: Promise<number> | null = null;
let cached: number | null = null;
let cacheTimestamp = 0;

export function readLlmRepoStarsCache(): number | null {
  if (cached !== null && Date.now() - cacheTimestamp < CLIENT_CACHE_MS) {
    return cached;
  }
  return null;
}

export async function fetchLlmRepoStars(options?: {
  force?: boolean;
}): Promise<number> {
  const force = options?.force === true;
  const now = Date.now();

  if (!force && cached !== null && now - cacheTimestamp < CLIENT_CACHE_MS) {
    return cached;
  }
  if (inflight) {
    if (!force) return inflight;
    await inflight.catch(() => {});
  }

  inflight = (async () => {
    const baseUrl = import.meta.env.BASE_URL || "/";
    const apiPath = baseUrl.endsWith("/")
      ? "api/llm-from-scratch-stars"
      : "/api/llm-from-scratch-stars";
    const response = await fetch(`${baseUrl}${apiPath}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as { stars: number };
    cached = data.stars;
    cacheTimestamp = Date.now();
    return data.stars;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function startLlmRepoStarsPolling(
  onStars: (stars: number) => void,
): () => void {
  let cancelled = false;
  let lastPollAt = 0;

  const pull = (minGapMs: number, force: boolean) => {
    const now = Date.now();
    if (minGapMs > 0 && now - lastPollAt < minGapMs) return;
    lastPollAt = now;
    void fetchLlmRepoStars(force ? { force: true } : undefined)
      .then((stars) => {
        if (!cancelled) onStars(stars);
      })
      .catch(() => {});
  };

  pull(0, false);

  const intervalId = window.setInterval(() => {
    if (document.visibilityState === "visible") pull(0, true);
  }, POLL_MS);

  const onVis = () => {
    if (document.visibilityState === "visible") pull(30_000, true);
  };
  document.addEventListener("visibilitychange", onVis);

  return () => {
    cancelled = true;
    window.clearInterval(intervalId);
    document.removeEventListener("visibilitychange", onVis);
  };
}
