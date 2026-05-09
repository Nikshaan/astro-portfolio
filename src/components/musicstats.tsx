import { useEffect, useState, useCallback, memo } from 'react';
import MusicCharts from './musiccharts';
import { loadMusicStatsData, readMusicStatsCache, type MusicStatsData } from '../utils/musicStatsClient';

export type { GenreEntry } from '../utils/musicStatsClient';

export default memo(function MusicStatsClient() {
    const [data, setData] = useState<MusicStatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        const hit = readMusicStatsCache();
        if (hit) {
            setData(hit);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const musicData = await loadMusicStatsData();
            setData(musicData);
            setError(null);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load music stats';
            setError(errorMessage);
            const fallback = readMusicStatsCache();
            if (fallback) {
                setData(fallback);
                setError(null);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (loading && !data) {
        return (
            <div
                className="music-stats-loading w-full h-full flex flex-col justify-around pb-4 animate-pulse"
                aria-hidden="true"
            >
                
                <div className="flex flex-col md:flex-row justify-center md:justify-around items-center md:items-start gap-12 md:gap-4 px-4 pt-4 pb-4 w-full rounded-2xl"
                    style={{ background: 'linear-gradient(90deg, var(--shimmer-from-1, #1f1f1f) 25%, var(--shimmer-to-1, #2a2a2a) 50%, var(--shimmer-from-1, #1f1f1f) 75%)', backgroundSize: '800px 100%', animation: 'musicShimmer 1.6s infinite linear' }}>
                  
                    <div className="w-full flex flex-col items-center gap-3">
                        <div className="music-stats-skel-strong h-4 w-36 rounded" />
                        {[120, 100, 110, 100].map((w, i) => (
                            <div key={i} className="music-stats-skel-soft h-3 rounded" style={{ width: w }} />
                        ))}
                    </div>
                    <div className="w-full flex flex-col items-center gap-3">
                        <div className="music-stats-skel-strong h-4 w-44 rounded" />
                        {[140, 120, 110, 130, 100].map((w, i) => (
                            <div key={i} className="music-stats-skel-soft h-3 rounded" style={{ width: w }} />
                        ))}
                    </div>
                </div>
                <div className="flex flex-col w-full mt-8 lg:mt-4 h-[180px] lg:h-[250px]">
                    <div className="h-4 w-40 rounded mx-auto mb-3" style={{ backgroundImage: 'linear-gradient(90deg, var(--shimmer-from, #2a2a2a) 25%, var(--shimmer-to, #3a3a3a) 50%, var(--shimmer-from, #2a2a2a) 75%)', backgroundSize: '800px 100%', animation: 'musicShimmer 1.6s infinite linear' }} />
                    <div className="flex-1 rounded-xl" style={{ backgroundImage: 'linear-gradient(90deg, var(--shimmer-from-2, #1a1a1a) 25%, var(--shimmer-to-2, #232323) 50%, var(--shimmer-from-2, #1a1a1a) 75%)', backgroundSize: '800px 100%', animation: 'musicShimmer 1.6s 0.1s infinite linear' }} />
                </div>
                <style>{`
                    .music-stats-skel-strong {
                        background: rgba(255, 255, 255, 0.12);
                    }
                    .music-stats-skel-soft {
                        background: rgba(255, 255, 255, 0.08);
                    }
                    @keyframes musicShimmer {
                        0%   { background-position: -400px 0; }
                        100% { background-position: 400px 0; }
                    }
                    [data-theme="light"] .music-stats-loading {
                        --shimmer-from: #bfdbfe;
                        --shimmer-to: #93c5fd;
                        --shimmer-from-1: #dbeafe;
                        --shimmer-to-1: #93c5fd;
                        --shimmer-from-2: #bfdbfe;
                        --shimmer-to-2: #3b82f6;
                    }
                    [data-theme="light"] .music-stats-loading .music-stats-skel-strong,
                    [data-theme="light"] .music-stats-loading .music-stats-skel-soft {
                        background-image: linear-gradient(
                            90deg,
                            #bfdbfe 25%,
                            #93c5fd 50%,
                            #bfdbfe 75%
                        );
                        background-size: 800px 100%;
                        animation: musicShimmer 1.6s infinite linear;
                    }
                `}</style>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="text-red-400 text-sm">{error}</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="text-gray-400 text-sm">No data available</div>
            </div>
        );
    }

    const bgStyle: React.CSSProperties = data.topArtistImageUrl
        ? {
            backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url(${data.topArtistImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '1.25rem',
            transition: 'background-image 0.4s ease',
        }
        : {};

    return (
        <div className="flex flex-col justify-around pb-4 touch-manipulation">
            <div
                className="flex flex-col md:flex-row justify-center md:justify-around items-center md:items-start gap-12 md:gap-4 px-4 pt-4 pb-4 w-full"
                style={bgStyle}
            >
                <div className="w-full text-center">
                    <p className="mb-3 text-base md:text-lg text-center font-bold !text-white [html[data-theme=light]_&]:!text-white">Total music scrobbles</p>
                    <div className="flex flex-col items-center w-full gap-2 text-sm md:text-base">
                        <p><span className='font-medium !text-white'>Play count:</span>{' '}
                            <span className="!text-white opacity-80">{data.upperStatsArray[0]?.toLocaleString()}</span>
                        </p>
                        <p><span className='font-medium !text-white'>Track count:</span>{' '}
                            <span className="!text-white opacity-80">{data.upperStatsArray[1]?.toLocaleString()}</span>
                        </p>
                        <p><span className='font-medium !text-white'>Artist count:</span>{' '}
                            <span className="!text-white opacity-80">{data.upperStatsArray[2]?.toLocaleString()}</span>
                        </p>
                        <p><span className='font-medium !text-white'>Album count:</span>{' '}
                            <span className="!text-white opacity-80">{data.upperStatsArray[3]?.toLocaleString()}</span>
                        </p>
                    </div>
                </div>

                <div className="w-full text-center">
                    <p className="mb-3 text-base md:text-lg text-center font-bold !text-white [html[data-theme=light]_&]:!text-white">Top artists of the week</p>
                    <div className="text-sm md:text-base">
                        {data.artistsInfo.length > 0 ? (
                            data.artistsInfo.map((artist, index) => (
                                <div key={index} className="flex flex-col sm:flex-row justify-center items-center h-full w-full gap-1 sm:gap-2 mb-2">
                                    <div className="flex gap-2">
                                        <p className="font-medium !text-white">{artist.name}</p>
                                        <p className="!text-white opacity-70">plays: {artist.count}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="!text-white opacity-60 text-xs italic">No recent listening data available</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col w-full mt-8 lg:mt-4 h-[180px] lg:h-[250px]">
                <p className="mb-3 text-base md:text-lg text-center font-bold [html[data-theme=light]_&]:!text-black">Daily music scrobbles</p>
                <div className="w-full flex-1 select-none min-h-0">
                    <MusicCharts data={data.weeklyScrobbles} />
                </div>
            </div>

        </div>
    );
});
