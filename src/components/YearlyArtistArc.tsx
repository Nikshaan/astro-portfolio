import {
    memo,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { YearlyArcPayload } from '../utils/yearlyArcClient';
import { loadYearlyArcPayload, readYearlyArcCache } from '../utils/yearlyArcClient';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

function smoothAreaPathD(xs: number[], ysTop: number[], baselineY: number): string {
    const n = xs.length;
    if (n === 0) return '';
    if (n === 1) {
        const x = xs[0];
        const y = ysTop[0];
        return `M ${x},${baselineY} L ${x},${y} L ${x},${baselineY} Z`;
    }
    let d = `M ${xs[0]},${baselineY} L ${xs[0]},${ysTop[0]}`;
    for (let i = 0; i < n - 1; i++) {
        const x0 = xs[i];
        const y0 = ysTop[i];
        const x1 = xs[i + 1];
        const y1 = ysTop[i + 1];
        const cx = (x0 + x1) / 2;
        d += ` C ${cx},${y0} ${cx},${y1} ${x1},${y1}`;
    }
    d += ` L ${xs[n - 1]},${baselineY} Z`;
    return d;
}

function formatWeekLabel(fromSec: number): string {
    return new Date(fromSec * 1000).toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

function useCoarsePointer() {
    return useSyncExternalStore(
        (onStoreChange) => {
            if (typeof window === 'undefined') return () => {};
            const mq = window.matchMedia('(pointer: coarse)');
            const handler = () => onStoreChange();
            mq.addEventListener('change', handler);
            return () => mq.removeEventListener('change', handler);
        },
        () => (typeof window === 'undefined' ? false : window.matchMedia('(pointer: coarse)').matches),
        () => false,
    );
}

function formatAxisUtc(fromSec: number, variant: 'short' | 'long'): string {
    return new Date(fromSec * 1000).toLocaleDateString(undefined, {
        month: 'short',
        ...(variant === 'long' ? { year: 'numeric' } : {}),
        timeZone: 'UTC',
    });
}

export default memo(function YearlyArtistArc() {
    const boot = readYearlyArcCache();
    const [shouldLoad, setShouldLoad] = useState(() => boot !== null);
    const [data, setData] = useState<YearlyArcPayload | null>(() => boot);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hoverIx, setHoverIx] = useState<number | null>(null);
    const [isLightTheme, setIsLightTheme] = useState(false);
    const coarsePointer = useCoarsePointer();
    const rootObsRef = useRef<HTMLDivElement | null>(null);
    const interactionRef = useRef<HTMLDivElement | null>(null);

    const bindRootEl = useCallback((el: HTMLDivElement | null) => {
        rootObsRef.current = el;
        interactionRef.current = el;
    }, []);

    useEffect(() => {
        const sync = () =>
            setIsLightTheme(document.documentElement.getAttribute('data-theme') === 'light');
        sync();
        const observer = new MutationObserver(sync);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (shouldLoad) return;
        const el = rootObsRef.current;
        if (!el) return;
        const io = new IntersectionObserver(
            (entries) => {
                const hit = entries.some((e) => e.isIntersecting);
                if (hit) {
                    setShouldLoad(true);
                    io.disconnect();
                }
            },
            { root: null, rootMargin: '400px 0px 340px 0px', threshold: 0 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [shouldLoad]);

    useEffect(() => {
        if (!shouldLoad) return;
        let cancel = false;
        const prefetch = readYearlyArcCache();
        if (prefetch) {
            setData(prefetch);
            setError(null);
            setLoading(false);
        } else {
            setLoading(true);
        }
        loadYearlyArcPayload()
            .then((payload) => {
                if (cancel) return;
                setData(payload);
                setError(null);
            })
            .catch((err: unknown) => {
                if (cancel) return;
                const message = err instanceof Error ? err.message : 'Failed to load yearly arc';
                setError(message);
                const fallback = readYearlyArcCache();
                if (fallback) {
                    setData(fallback);
                    setError(null);
                }
            })
            .finally(() => {
                if (!cancel) setLoading(false);
            });
        return () => {
            cancel = true;
        };
    }, [shouldLoad]);

    useEffect(() => {
        if (!coarsePointer) return;
        const onDocPointerDown = (e: PointerEvent) => {
            const el = interactionRef.current;
            if (!el?.contains(e.target as Node)) {
                setHoverIx(null);
            }
        };
        document.addEventListener('pointerdown', onDocPointerDown, true);
        return () => document.removeEventListener('pointerdown', onDocPointerDown, true);
    }, [coarsePointer]);

    const layout = useMemo(() => {
        if (!data?.weeks?.length || !data.artists?.length) return null;

        const nW = data.weeks.length;
        const nA = data.artists.length;

        const xPadStart = 0.55;
        const xPadEnd = 0.55;
        const xSpan = 100 - xPadStart - xPadEnd;

        const xs =
            nW === 1
                ? [xPadStart + xSpan / 2]
                : data.weeks.map((_, i) => xPadStart + (i / (nW - 1)) * xSpan);

        const lanes = data.artists.map((artist) => {
            const raw = artist.plays.slice(0, nW);
            const vals =
                raw.length >= nW
                    ? raw
                    : [...raw, ...Array.from({ length: nW - raw.length }, () => 0)];
            const maxV = vals.reduce((m, v) => Math.max(m, v), 0);
            const baseY = 9.62;
            const topZone = 0.92;
            const span = Math.max(baseY - topZone, 0.001);
            const ysTop =
                maxV <= 0
                    ? vals.map(() => baseY)
                    : vals.map((v) =>
                          v <= 0 ? baseY : baseY - Math.min(span, (v / maxV) * span),
                      );
            const pathD = smoothAreaPathD(xs, ysTop, baseY);
            return { pathD, artist };
        });

        const midIx = Math.max(0, Math.floor((nW - 1) / 2));

        return { nW, nA, lanes, midIx };
    }, [data]);

    useLayoutEffect(() => {
        if (!layout?.nW || coarsePointer) return;
        setHoverIx((prev) => (prev !== null ? prev : layout.nW - 1));
    }, [layout?.nW, coarsePointer]);

    const weekDetail = useMemo(() => {
        if (hoverIx === null || !data?.artists?.length || hoverIx < 0 || !data.weeks[hoverIx])
            return null;
        const fromSec = data.weeks[hoverIx].from;
        const rows: { name: string; plays: number }[] = [];
        for (const a of data.artists) {
            const p = a.plays[hoverIx] ?? 0;
            if (p > 0) rows.push({ name: a.name, plays: p });
        }
        rows.sort((a, b) => b.plays - a.plays || a.name.localeCompare(b.name));
        return { fromSec, rows };
    }, [hoverIx, data]);

    const onBandMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (coarsePointer) return;
        if (!layout?.nW) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const frac = rect.width <= 0 ? 0 : x / rect.width;
        const maxIx = layout.nW - 1;
        const ix = Math.min(maxIx, Math.max(0, Math.round(frac * maxIx)));
        setHoverIx(ix);
    };

    const onWeekColumnPointerDown = useCallback(
        (wi: number) => {
            if (!layout?.nW || !coarsePointer) return;
            setHoverIx((prev) => (prev === wi ? null : wi));
        },
        [layout?.nW, coarsePointer],
    );

    const chartReady = !!(
        layout?.lanes?.length &&
        data?.artists?.length &&
        data?.weeks?.length
    );
    const showSkeleton = shouldLoad && loading && !(data?.artists?.length);
    const showError = shouldLoad && !!(error ?? null) && !(data?.artists?.length);
    const showEmpty =
        shouldLoad &&
        !loading &&
        !showError &&
        data &&
        (!data.artists?.length || !data.weeks?.length);

    return (
        <div
            ref={bindRootEl}
            className={cn(
                'yearly-arc-root flex w-full max-w-full min-w-0 flex-1 flex-col overflow-x-hidden',
                'min-h-[min(260px,72vw)] sm:min-h-[280px] md:min-h-[300px] lg:min-h-[320px]',
            )}
        >
            {showError ? (
                <div className="flex-1 flex items-center justify-center text-red-400 text-sm px-3 py-6">
                    {error}
                </div>
            ) : null}

            {showSkeleton ? (
                <div
                    className="yearly-arc-shimmer flex-1 w-full flex flex-col justify-center gap-2.5 sm:gap-3 py-5 px-3"
                    aria-hidden="true"
                >
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-2 sm:gap-3 items-center">
                            <div
                                className="h-3 rounded shrink-0 w-[30%]"
                                style={{
                                    backgroundImage:
                                        'linear-gradient(90deg, var(--shimmer-from, #2a2a2a) 25%, var(--shimmer-to, #3a3a3a) 50%, var(--shimmer-from, #2a2a2a) 75%)',
                                    backgroundSize: '400px 100%',
                                    animation: 'yearlyArcShimmer 1.6s infinite linear',
                                }}
                            />
                            <div
                                className="flex-1 h-8 rounded-lg min-h-[1.85rem]"
                                style={{
                                    backgroundImage:
                                        'linear-gradient(90deg, var(--shimmer-from-2, #1a1a1a) 25%, var(--shimmer-to-2, #232323) 50%, var(--shimmer-from-2, #1a1a1a) 75%)',
                                    backgroundSize: '600px 100%',
                                    animation: 'yearlyArcShimmer 1.6s infinite linear',
                                }}
                            />
                        </div>
                    ))}
                    <style>{`
                        @keyframes yearlyArcShimmer {
                            0% { background-position: -200px 0; }
                            100% { background-position: 200px 0; }
                        }
                        [data-theme="light"] .yearly-arc-shimmer {
                            --shimmer-from: #bfdbfe;
                            --shimmer-to: #93c5fd;
                            --shimmer-from-2: #dbeafe;
                            --shimmer-to-2: #3b82f6;
                        }
                    `}</style>
                </div>
            ) : null}

            {showEmpty ? (
                <div
                    className={cn(
                        'flex-1 flex items-center justify-center text-sm px-3 py-6',
                        isLightTheme ? 'text-slate-600' : 'text-neutral-400',
                    )}
                >
                    Not enough weekly listening history yet.
                </div>
            ) : null}

            {chartReady && layout && data ? (
                <div className="flex w-full min-h-0 flex-1 flex-col gap-2 sm:gap-3 pb-1">
                    <section
                        aria-live="polite"
                        aria-label="Selected week play counts"
                        className={cn(
                            'flex shrink-0 flex-col gap-1.5 pb-2 pt-0.5 text-left sm:gap-2 sm:pb-2.5',
                            isLightTheme ? 'text-neutral-900' : 'text-neutral-100',
                        )}
                    >
                        {hoverIx === null ? (
                            <p
                                className={cn(
                                    'text-[11px] leading-snug sm:text-xs',
                                    isLightTheme ? 'text-slate-600' : 'text-neutral-400',
                                )}
                            >
                                {coarsePointer ? (
                                    <>Tap a week column in the chart below.</>
                                ) : (
                                    <>Hover over the chart below.</>
                                )}
                            </p>
                        ) : (
                            <>
                                <p className="m-0 text-[11px] font-semibold leading-snug sm:text-xs">
                                    {weekDetail !== null ? (
                                        <time dateTime={new Date(weekDetail.fromSec * 1000).toISOString().slice(0, 10)}>
                                            {formatWeekLabel(weekDetail.fromSec)}
                                        </time>
                                    ) : null}
                                </p>
                                {weekDetail?.rows?.length ? (
                                    <ul className="m-0 flex list-none flex-row flex-wrap content-start gap-x-2.5 gap-y-1.5 p-0 text-[11px] leading-snug sm:gap-x-3 sm:text-xs md:gap-x-4 md:text-[0.8125rem]">
                                        {weekDetail.rows.map((r) => (
                                            <li
                                                key={`${weekDetail.fromSec}-${r.name}`}
                                                className="inline-flex max-w-full min-w-0 items-baseline gap-1 sm:gap-1.5"
                                            >
                                                <span
                                                    className={cn(
                                                        'min-w-0 shrink truncate text-left text-[11px] sm:text-xs md:text-[0.8125rem]',
                                                        'max-w-[min(40vw,10.5rem)] sm:max-w-[11.5rem] md:max-w-[13rem] lg:max-w-[14rem]',
                                                        isLightTheme ? 'text-neutral-900' : 'text-neutral-100',
                                                    )}
                                                    title={r.name}
                                                >
                                                    {r.name}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'select-none shrink-0 text-[0.65rem] opacity-60 sm:text-[0.7rem]',
                                                        isLightTheme ? 'text-neutral-900' : 'text-neutral-100',
                                                    )}
                                                >
                                                    ·
                                                </span>
                                                <span
                                                    className={cn(
                                                        'shrink-0 font-semibold tabular-nums',
                                                        isLightTheme ? 'text-neutral-900' : 'text-neutral-100',
                                                    )}
                                                >
                                                    {r.plays.toLocaleString()}
                                                </span>
                                                </li>
                                        ))}
                                    </ul>
                                ) : (
                                        <p
                                            className={cn(
                                                'm-0 text-[11px] sm:text-xs',
                                                isLightTheme ? 'text-slate-600' : 'text-neutral-300',
                                            )}
                                        >
                                            No plays for top artists this week.
                                        </p>
                                    )}
                            </>
                        )}
                    </section>

                    <div className="flex w-full min-h-[184px] flex-1 flex-row gap-2 sm:min-h-[200px] sm:gap-3 md:min-h-[208px] md:gap-4 lg:min-h-[216px] lg:gap-5">
                        <div
                            className="flex w-[31%] min-w-[5.85rem] shrink-0 flex-col sm:min-w-0 sm:w-[26%] md:w-[20%]"
                            aria-hidden={false}
                        >
                        {layout.lanes.map(({ artist }) => (
                            <div
                                key={artist.name}
                                className={cn(
                                    'flex items-center justify-end pr-0.5 sm:pr-1 min-h-[22px] sm:min-h-[26px] md:min-h-[30px] lg:min-h-[32px] py-[1px]',
                                    'text-[10px] sm:text-[11px] md:text-[0.95rem] font-medium tracking-tight',
                                    isLightTheme ? 'text-neutral-900' : 'text-neutral-100',
                                )}
                            >
                                <span className="text-right truncate w-full" title={artist.name}>
                                    {artist.name}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                        <div
                            className="relative z-10 min-h-[clamp(164px,40vw,204px)] flex-1 overflow-hidden rounded-md sm:min-h-[188px] md:min-h-[196px] lg:min-h-[212px]"
                            role="img"
                            aria-label="Rolling year listening ridge chart for leading artists."
                            tabIndex={-1}
                        >
                            <div className="absolute inset-0 z-[8] flex flex-col gap-y-[2px] sm:gap-y-1 md:gap-y-[3px] pointer-events-none">
                                {layout.lanes.map(({ pathD }, li) => {
                                    const denom = layout.nA > 1 ? layout.nA - 1 : 1;
                                    const fillMix = `${Math.round(
                                        Math.max(
                                            0.18,
                                            0.9 - li * ((0.9 - 0.2) / denom),
                                        ) * 100,
                                    )}%`;
                                    return (
                                        <div
                                            key={li}
                                            className="flex-1 min-h-[clamp(17px,4.2vw,26px)] sm:min-h-[24px] md:min-h-[26px]"
                                            style={{ color: 'var(--yearly-accent)' }}
                                        >
                                            <svg
                                                className="w-full h-full block overflow-visible"
                                                viewBox="0 0 100 10"
                                                preserveAspectRatio="none"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    d={pathD}
                                                    fill={`color-mix(in srgb, var(--yearly-accent) ${fillMix}, transparent)`}
                                                    stroke="var(--yearly-accent)"
                                                    strokeOpacity={isLightTheme ? 0.35 : 0.42}
                                                    strokeWidth={0.26}
                                                    vectorEffect="non-scaling-stroke"
                                                />
                                            </svg>
                                        </div>
                                    );
                                })}
                            </div>

                            <div
                                role="presentation"
                                className={cn(
                                    'absolute inset-0 flex flex-row touch-none z-[12]',
                                    coarsePointer ? 'cursor-pointer' : 'cursor-crosshair',
                                )}
                                style={{ touchAction: coarsePointer ? 'manipulation' : 'none' }}
                                onPointerEnter={onBandMove}
                                onPointerMove={onBandMove}
                            >
                                {data.weeks.map((_, wi) => (
                                    <div
                                        key={wi}
                                        role={coarsePointer ? 'button' : undefined}
                                        tabIndex={coarsePointer ? 0 : undefined}
                                        aria-label={
                                            coarsePointer
                                                ? `Week of ${formatWeekLabel(data.weeks[wi].from)}, show plays`
                                                : undefined
                                        }
                                        aria-pressed={
                                            coarsePointer ? hoverIx === wi : undefined
                                        }
                                        onPointerDown={() => {
                                            if (!coarsePointer) return;
                                            onWeekColumnPointerDown(wi);
                                        }}
                                        onKeyDown={(e) => {
                                            if (!coarsePointer) return;
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onWeekColumnPointerDown(wi);
                                            }
                                        }}
                                        className={cn(
                                            'flex-1 min-w-0 h-full transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--yearly-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
                                            hoverIx === wi
                                                ? isLightTheme
                                                    ? 'bg-blue-600/[0.08]'
                                                    : 'bg-[rgba(172,70,253,0.14)]'
                                                : '',
                                        )}
                                        aria-hidden={!coarsePointer}
                                    />
                                ))}
                            </div>

                        </div>

                        <div
                            className={cn(
                                'pointer-events-none flex flex-row justify-between shrink-0 pt-2 gap-3',
                                isLightTheme ? 'text-slate-600' : 'text-neutral-500',
                            )}
                        >
                            <span className="text-[10px] sm:text-[11px] truncate">
                                {formatAxisUtc(data.weeks[0].from, 'long')}
                            </span>
                            {layout.nW >= 3 ? (
                                <span className="text-[10px] sm:text-[11px] truncate text-center shrink">
                                    {formatAxisUtc(data.weeks[layout.midIx].from, 'short')}
                                </span>
                            ) : (
                                <span aria-hidden={true} className="opacity-0 text-[11px]">
                                    ·
                                </span>
                            )}
                            <span className="text-[10px] sm:text-[11px] truncate text-right">
                                {formatAxisUtc(data.weeks[data.weeks.length - 1].from, 'long')}
                            </span>
                        </div>
                    </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
});
