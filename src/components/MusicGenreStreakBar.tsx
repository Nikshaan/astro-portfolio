import { useEffect, useState, memo } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { loadMusicStatsData, readMusicStatsCache, type GenreEntry, type MusicStatsData } from '../utils/musicStatsClient';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface MusicGenreStreakPayload {
    listeningStreak?: number;
    genreData?: GenreEntry[];
}

function sliceGenrePayload(full: MusicStatsData): MusicGenreStreakPayload {
    return { listeningStreak: full.listeningStreak, genreData: full.genreData };
}

function capitalise(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

const SWATCH_PURPLE = ['#7c3aed', '#9333ea', '#a855f7', '#c084fc', '#e879f9', '#a78bfa', '#8b5cf6', '#6d28d9'];
const SWATCH_BLUE = ['#1e3a8a', '#1d4ed8', '#1e40af', '#3730a3', '#6d28d9', '#701a75', '#0f766e', '#9a3412'];

export default memo(function MusicGenreStreakBar() {
    const [data, setData] = useState<MusicGenreStreakPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLightTheme, setIsLightTheme] = useState(false);

    useEffect(() => {
        const checkTheme = () =>
            setIsLightTheme(document.documentElement.getAttribute('data-theme') === 'light');
        checkTheme();
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const hit = readMusicStatsCache();
        if (hit) {
            setData(sliceGenrePayload(hit));
            setLoading(false);
            return;
        }
        void (async () => {
            try {
                const d = await loadMusicStatsData();
                setData(sliceGenrePayload(d));
            } catch {
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const streak = data?.listeningStreak ?? 0;
    const genreData = data?.genreData ?? [];
    const total = genreData.reduce((s, d) => s + d.count, 0);
    const palette = isLightTheme ? SWATCH_BLUE : SWATCH_PURPLE;

    return (
        <div
            className={cn(
                'flex w-full min-w-0 flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5 md:px-6 md:py-3',
                'justify-between sm:justify-start'
            )}
        >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
                {loading ? (
                    <div
                        className="genre-streak-shimmer h-3 w-full max-w-md rounded"
                        style={{
                            backgroundImage:
                                'linear-gradient(90deg, var(--shimmer-from, #2a2a2a) 25%, var(--shimmer-to, #3a3a3a) 50%, var(--shimmer-from, #2a2a2a) 75%)',
                            backgroundSize: '400px 100%',
                            animation: 'genreStreakShimmer 1.6s infinite linear',
                        }}
                        aria-hidden="true"
                    />
                ) : genreData.length > 0 ? (
                    genreData.map((d, i) => {
                        const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                        return (
                            <span
                                key={d.genre}
                                className={cn(
                                    'inline-flex min-w-0 max-w-full items-baseline gap-1.5 text-sm',
                                    isLightTheme ? 'text-neutral-900' : 'text-neutral-100'
                                )}
                            >
                                <span
                                    className="shrink-0 text-[0.65rem] leading-none opacity-90"
                                    style={{ color: palette[i % palette.length] }}
                                    aria-hidden="true"
                                >
                                    ●
                                </span>
                                <span className="min-w-0 truncate">{capitalise(d.genre)}</span>
                                <span className="shrink-0 tabular-nums opacity-80">— {pct}%</span>
                            </span>
                        );
                    })
                ) : (
                    <span className={cn('text-sm', isLightTheme ? 'text-slate-600' : 'text-neutral-400')}>
                        Not enough genre data yet
                    </span>
                )}
            </div>
            <div
                className={cn(
                    'hidden h-[1.125rem] w-px shrink-0 self-center sm:block',
                    isLightTheme ? 'bg-blue-900/25' : 'bg-white/15'
                )}
                aria-hidden="true"
            />
            <div
                className={cn(
                    'flex w-full shrink-0 items-center gap-2 border-t border-white/10 pt-2 sm:w-auto sm:border-t-0 sm:pt-0',
                    isLightTheme ? 'border-blue-900/15' : ''
                )}
            >
                <span
                    className={cn(
                        'text-sm font-medium not-italic',
                        isLightTheme ? 'text-neutral-900' : 'text-neutral-100'
                    )}
                    aria-hidden="true"
                >
                    ♪
                </span>
                {loading ? (
                    <div
                        className="genre-streak-shimmer h-3 w-32 rounded"
                        style={{
                            backgroundImage:
                                'linear-gradient(90deg, var(--shimmer-from, #2a2a2a) 25%, var(--shimmer-to, #3a3a3a) 50%, var(--shimmer-from, #2a2a2a) 75%)',
                            backgroundSize: '400px 100%',
                            animation: 'genreStreakShimmer 1.6s infinite linear',
                        }}
                        aria-hidden="true"
                    />
                ) : streak > 0 ? (
                    <span className={cn('text-sm font-medium', isLightTheme ? 'text-neutral-900' : 'text-neutral-100')}>
                        {streak} day listening streak
                    </span>
                ) : (
                    <span className={cn('text-xs', isLightTheme ? 'text-slate-600' : 'text-neutral-400')}>
                        No streak yet
                    </span>
                )}
            </div>
            <style>{`
                @keyframes genreStreakShimmer {
                    0% { background-position: -200px 0; }
                    100% { background-position: 200px 0; }
                }
                [data-theme='light'] .genre-streak-shimmer {
                    --shimmer-from: #bfdbfe;
                    --shimmer-to: #93c5fd;
                }
            `}</style>
        </div>
    );
});
