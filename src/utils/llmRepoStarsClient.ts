import { createLiveResource } from "./liveResource";

const PERSISTENT_CACHE_KEY = "nikshaan_llm_repo_stars_v1";
const PERSISTENT_TTL_MS = 24 * 60 * 60 * 1000;
const FRESH_MS = 30 * 60 * 1000;
const POLL_MS = 30 * 60 * 1000;

function validateStars(data: unknown): number {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid stars payload");
  }
  const parsed = data as { stars?: number; error?: string };
  if (parsed.error) throw new Error(parsed.error);
  if (typeof parsed.stars !== "number") {
    throw new Error("Invalid stars payload");
  }
  return parsed.stars;
}

const resource = createLiveResource<number>({
  key: PERSISTENT_CACHE_KEY,
  url: "api/llm-from-scratch-stars",
  validate: validateStars,
  freshMs: FRESH_MS,
  pollMs: POLL_MS,
  maxAgeMs: PERSISTENT_TTL_MS,
});

export function readLlmRepoStarsCache(): number | null {
  return resource.read();
}

export function fetchLlmRepoStars(options?: { force?: boolean }): Promise<number> {
  return resource.load(options);
}

export function startLlmRepoStarsPolling(
  onStars: (stars: number) => void,
): () => void {
  return resource.subscribe((snap) => {
    if (snap.data !== null) onStars(snap.data);
  });
}
