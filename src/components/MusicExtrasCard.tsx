import { useEffect, useState, lazy, Suspense, memo } from 'react';
import { m, LazyMotion, domAnimation } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Music2 } from 'lucide-react';

const GenreDonut = lazy(() => import('./GenreDonut'));

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface GenreEntry {
    genre: string;
    count: number;
}

interface MusicExtrasData {
    listeningStreak?: number;
    genreData?: GenreEntry[];
}

let cachedExtrasData: MusicExtrasData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;
let fetchPromise: Promise<MusicExtrasData> | null = null;

export default memo(function MusicExtrasCard() {
    const [data, setData] = useState<MusicExtrasData | null>(cachedExtrasData);
    const [loading, setLoading] = useState(!cachedExtrasData);
    const [isLightTheme, setIsLightTheme] = useState(false);

    useEffect(() => {
        const checkTheme = () => setIsLightTheme(document.documentElement.getAttribute('data-theme') === 'light');
        checkTheme();
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const now = Date.now();
        if (cachedExtrasData && now - cacheTimestamp < CACHE_DURATION) {
            setData(cachedExtrasData);
            setLoading(false);
            return;
        }

        const load = async () => {
            if (fetchPromise) {
                try { const d = await fetchPromise; setData(d); }
                catch {}
                finally { setLoading(false); }
                return;
            }
            try {
                const baseUrl = import.meta.env.BASE_URL || '/';
                const apiPath = baseUrl.endsWith('/') ? 'api/music-stats' : '/api/music-stats';
                fetchPromise = fetch(`${baseUrl}${apiPath}`, {
                    cache: 'default',
                    headers: { Accept: 'application/json' },
                }).then(async (res) => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.json() as Promise<MusicExtrasData>;
                });
                const d = await fetchPromise;
                cachedExtrasData = d;
                cacheTimestamp = Date.now();
                setData(d);
            } catch {}
            finally { setLoading(false); fetchPromise = null; }
        };
        load();
    }, []);

    const streak = data?.listeningStreak ?? 0;

    return (
        <LazyMotion features={domAnimation}>
            <m.div
                className={cn(
                    "relative rounded-3xl border flex flex-col h-full w-full overflow-hidden",
                    "bg-neutral-50 dark:bg-[#171717] border-white dark:border-white/20",
                    "[.data-theme='light']_&:!bg-[#dbeafe] [.data-theme='light']_&:!border-[#1e3a8a]",
                )}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                whileInView={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } }}
                viewport={{ once: true, amount: 0.1 }}
            >
                <div className="px-5 pt-5 pb-0 shrink-0">
                    <h3 className="text-xl font-medium">Genre Breakdown</h3>
                </div>

                <div className="flex-1 min-h-0 p-4">
                    {loading ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <p className="text-neutral-400 text-sm">Loading genre data…</p>
                        </div>
                    ) : (data?.genreData && data.genreData.length > 0) ? (
                        <Suspense fallback={
                            <div className="w-full h-full flex items-center justify-center">
                                <p className="text-neutral-400 text-sm">Loading chart…</p>
                            </div>
                        }>
                            <div className="w-full h-full">
                                <GenreDonut data={data.genreData} />
                            </div>
                        </Suspense>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <p className="text-neutral-400 text-sm">Not enough genre data yet</p>
                        </div>
                    )}
                </div>

                <div className={cn(
                    "flex items-center justify-center gap-2 px-5 py-3 border-t shrink-0 group transition-colors duration-300",
                    isLightTheme ? "border-blue-900/30 bg-blue-100" : "border-purple-900/30 bg-[rgba(109,40,217,0.08)]"
                )}>
                    <Music2 size={13} className={cn("shrink-0 transition-colors duration-300", isLightTheme ? "text-slate-900" : "text-purple-400")} />
                    {loading ? (
                        <span className={cn("text-xs transition-colors duration-300", isLightTheme ? "text-slate-900" : "text-neutral-400")}>Loading streak…</span>
                    ) : streak > 0 ? (
                        <span className={cn("text-sm font-medium transition-colors duration-300", isLightTheme ? "text-slate-900" : "text-purple-300")}>
                            {streak} day listening streak
                        </span>
                    ) : (
                        <span className={cn("text-xs transition-colors duration-300", isLightTheme ? "text-slate-900" : "text-neutral-400")}>No streak yet</span>
                    )}
                </div>
            </m.div>
        </LazyMotion>
    );
});
