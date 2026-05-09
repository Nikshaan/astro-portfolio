export interface ContributionDay {
    contributionCount: number;
    date: string;
    color: string;
}

export interface ContributionWeek {
    contributionDays: ContributionDay[];
}

export interface ContributionCalendar {
    totalContributions: number;
    weeks: ContributionWeek[];
}

export interface ContributionsCollection {
    contributionCalendar: ContributionCalendar;
}

export interface GitHubUser {
    contributionsCollection: ContributionsCollection;
}

export interface GitHubAPIResponse {
    data: {
        user: GitHubUser;
    };
    errors?: Array<{ message: string }>;
}

let inflight: Promise<GitHubAPIResponse> | null = null;

export async function fetchGithubContributionsData(): Promise<GitHubAPIResponse> {
    if (inflight) return inflight;

    inflight = (async () => {
        const baseUrl = import.meta.env.BASE_URL || '/';
        const apiPath = baseUrl.endsWith('/') ? 'api/github-contributions' : '/api/github-contributions';
        const response = await fetch(`${baseUrl}${apiPath}`, {
            headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as GitHubAPIResponse;
    })();

    try {
        return await inflight;
    } finally {
        inflight = null;
    }
}
