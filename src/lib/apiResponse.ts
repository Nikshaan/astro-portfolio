import { waitUntil } from "@vercel/functions";

export type CdnProfile = "music" | "default" | "stale";

const CDN: Record<CdnProfile, { sMaxAge: number; swr: number }> = {
  music: { sMaxAge: 60, swr: 600 },
  default: { sMaxAge: 300, swr: 1800 },
  stale: { sMaxAge: 10, swr: 30 },
};

const BROWSER_MAX_AGE = 30;

export interface JsonResponseOptions {
  status?: number;
  cacheStatus: string;
  fetchedAt: number;
  cdn: CdnProfile;
}

export function jsonResponse(
  data: unknown,
  { status = 200, cacheStatus, fetchedAt, cdn }: JsonResponseOptions,
): Response {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Cache-Status": cacheStatus,
    "X-Fetched-At": String(fetchedAt),
  };

  if (status >= 400) {
    headers["Cache-Control"] = "no-store";
  } else {
    const { sMaxAge, swr } = CDN[cdn];
    headers["Cache-Control"] =
      `public, max-age=${BROWSER_MAX_AGE}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`;
  }

  return new Response(JSON.stringify(data), { status, headers });
}

export function keepAlive(task: Promise<unknown>): void {
  waitUntil(task.then(() => undefined, () => undefined));
}
