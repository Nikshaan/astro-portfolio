import { createLiveResource } from "./liveResource";

export interface Contribution {
  id: string;
  type: "pr" | "issue";
  title: string;
  url: string;
  createdAt: string;
  commentCount: number;
  repoName: string;
  repoStars: number;
  orgLogo: string;
}

const PERSISTENT_CACHE_KEY = "nikshaan_oss_contributions_v1";
const PERSISTENT_TTL_MS = 24 * 60 * 60 * 1000;
const FRESH_MS = 30 * 60 * 1000;
const POLL_MS = 15 * 60 * 1000;

function validateOss(data: unknown): Contribution[] {
  if (!Array.isArray(data)) {
    throw new Error("Invalid OSS contributions payload");
  }
  return data as Contribution[];
}

const resource = createLiveResource<Contribution[]>({
  key: PERSISTENT_CACHE_KEY,
  url: "api/oss-contributions",
  validate: validateOss,
  freshMs: FRESH_MS,
  pollMs: POLL_MS,
  maxAgeMs: PERSISTENT_TTL_MS,
});

export function readOssContributionsCache(): Contribution[] | null {
  return resource.read();
}

export function fetchOssContributionsData(): Promise<Contribution[]> {
  return resource.load();
}

export function subscribeOssContributions(
  listener: Parameters<typeof resource.subscribe>[0],
): () => void {
  return resource.subscribe(listener);
}
