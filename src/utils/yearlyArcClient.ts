export interface YearlyArcWeek {
    from: number;
    to: number;
}

export interface YearlyArcArtistRow {
    name: string;
    plays: number[];
}

export interface YearlyArcPayload {
    weeks: YearlyArcWeek[];
    artists: YearlyArcArtistRow[];
}

const CLIENT_CACHE_MS = 60 * 1000;

let cached: YearlyArcPayload | null = null;
let cachedAt = 0;
let inflightPromise: Promise<YearlyArcPayload> | null = null;

function buildUrl(untilSec: number): string {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const slug = baseUrl.endsWith('/') ? 'api/music-yearly-arc' : '/api/music-yearly-arc';
    return `${baseUrl}${slug}?until=${untilSec}`;
}

export function readYearlyArcCache(): YearlyArcPayload | null {
    if (cached && Date.now() - cachedAt < CLIENT_CACHE_MS) return cached;
    return null;
}

export function prefetchYearlyArcPayload(): void {
    void loadYearlyArcPayload().catch(() => {});
}

async function parsePayload(response: Response): Promise<YearlyArcPayload> {
    const parsed = (await response.json()) as Record<string, unknown>;
    if (parsed?.error || !Array.isArray(parsed?.weeks) || !Array.isArray(parsed?.artists)) {
        throw new Error('Invalid yearly arc payload');
    }
    return parsed as unknown as YearlyArcPayload;
}

export async function loadYearlyArcPayload(): Promise<YearlyArcPayload> {
    const untilSec = Math.floor(Date.now() / 1000);
    const now = Date.now();

    if (cached && now - cachedAt < CLIENT_CACHE_MS) return cached;

    if (inflightPromise) return inflightPromise;

    inflightPromise = (async () => {
        const response = await fetch(buildUrl(untilSec), {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await parsePayload(response);
        cached = payload;
        cachedAt = Date.now();
        return payload;
    })();

    try {
        return await inflightPromise;
    } finally {
        inflightPromise = null;
    }
}
