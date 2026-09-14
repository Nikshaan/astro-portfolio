/**
 * Safe client-side persistent cache helper for SWR (Stale-While-Revalidate) patterns.
 * Wraps localStorage with TTL validation, error-handling (private mode/quota limit),
 * and silent fallbacks.
 */

interface CacheEnvelope<T> {
  version: number;
  timestamp: number;
  data: T;
}

export interface PersistentEntry<T> {
  data: T;
  timestamp: number;
}

const CURRENT_CACHE_VERSION = 1;

export function getPersistentEntry<T>(
  key: string,
  maxAgeMs: number,
): PersistentEntry<T> | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (
      !parsed ||
      parsed.version !== CURRENT_CACHE_VERSION ||
      typeof parsed.timestamp !== "number"
    ) {
      window.localStorage.removeItem(key);
      return null;
    }

    if (Date.now() - parsed.timestamp > maxAgeMs) {
      return null;
    }

    return { data: parsed.data, timestamp: parsed.timestamp };
  } catch {
    return null;
  }
}

export function getPersistentCache<T>(key: string, maxAgeMs: number): T | null {
  const entry = getPersistentEntry<T>(key, maxAgeMs);
  return entry ? entry.data : null;
}

export function setPersistentCache<T>(
  key: string,
  data: T,
  timestamp = Date.now(),
): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    const envelope: CacheEnvelope<T> = {
      version: CURRENT_CACHE_VERSION,
      timestamp,
      data,
    };
    window.localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Quota exceeded or private browsing mode - silently ignore
  }
}
