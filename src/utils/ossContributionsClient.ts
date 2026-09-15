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

const PERSISTENT_CACHE_KEY = "nikshaan_oss_contributions_v2";
const PERSISTENT_TTL_MS = 12 * 60 * 60 * 1000;
const FRESH_MS = 10 * 60 * 1000;
const POLL_MS = 5 * 60 * 1000;

function isContribution(value: unknown): value is Contribution {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Contribution;
  return (
    typeof item.id === "string" &&
    (item.type === "pr" || item.type === "issue") &&
    typeof item.title === "string" &&
    typeof item.url === "string" &&
    typeof item.createdAt === "string" &&
    typeof item.commentCount === "number" &&
    typeof item.repoName === "string" &&
    typeof item.repoStars === "number" &&
    typeof item.orgLogo === "string"
  );
}

function validateOss(data: unknown): Contribution[] {
  if (!Array.isArray(data)) {
    throw new Error("Invalid OSS contributions payload");
  }
  const items = data.filter(isContribution);
  if (data.length > 0 && items.length === 0) {
    throw new Error("Invalid OSS contributions payload");
  }
  return items;
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

export function fetchOssContributionsData(options?: {
  force?: boolean;
}): Promise<Contribution[]> {
  return resource.load(options);
}

export function subscribeOssContributions(
  listener: Parameters<typeof resource.subscribe>[0],
): () => void {
  return resource.subscribe(listener);
}
