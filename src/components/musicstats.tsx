import { useEffect, useState, useCallback, memo } from 'react';
import MusicCharts from './musiccharts';

interface ArtistInfoType {
    name?: string;
    count?: string;
}

interface Daily {
    name?: string;
    scrobbles?: number;
}

export interface GenreEntry {
    genre: string;
    count: number;
}

interface MusicStatsData {
    weeklyScrobbles: Daily[];
    upperStatsArray: number[];
    artistsInfo: ArtistInfoType[];
    topArtistImageUrl?: string;
    topArtistName?: string;
    listeningStreak?: number;
    genreData?: GenreEntry[];
}

let cachedMusicData: MusicStatsData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000;
let fetchPromise: Promise<MusicStatsData> | null = null;

export default memo(function MusicStatsClient() {
    const [data, setData] = useState<MusicStatsData | null>(cachedMusicData);
    const [loading, setLoading] = useState(!cachedMusicData);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        const now = Date.now();
        if (cachedMusicData && now - cacheTimestamp < CACHE_DURATION) {
            setData(cachedMusicData);
            setLoading(false);
            return;
        }

        if (fetchPromise) {
            try {
                const musicData = await fetchPromise;
                setData(musicData);
                setError(null);
            } catch {
                setError('Failed to load music stats');
            } finally {
                setLoading(false);
            }
            return;
        }

        try {
            setLoading(true);
            const baseUrl = import.meta.env.BASE_URL || '/';
            const apiPath = baseUrl.endsWith('/') ? 'api/music-stats' : '/api/music-stats';

            fetchPromise = fetch(`${baseUrl}${apiPath}`, {
                cache: 'default',
                headers: { Accept: 'application/json' },
            }).then(async (response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch music stats`);
                const musicData = await response.json();
                if (!musicData.weeklyScrobbles || !musicData.upperStatsArray || !musicData.artistsInfo) {
                    throw new Error('Invalid data structure received');
                }
                return musicData as MusicStatsData;
            });

            const musicData = await fetchPromise;
            cachedMusicData = musicData;
            cacheTimestamp = Date.now();
            setData(musicData);
            setError(null);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load music stats';
            setError(errorMessage);
            if (cachedMusicData) {
                setData(cachedMusicData);
                setError(null);
            }
        } finally {
            setLoading(false);
            fetchPromise = null;
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (loading && !data) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="text-gray-400 text-sm">Loading music stats...</div>
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
            backgroundPosition: 'center top',
            borderRadius: '1.25rem',
            transition: 'background-image 0.4s ease',
        }
        : {};

    return (
        <div className="flex flex-col h-full justify-around pb-4">
            <div
                className="flex flex-col md:flex-row justify-center md:justify-around items-center md:items-start gap-12 md:gap-4 px-4 pt-4 pb-4 w-full"
                style={bgStyle}
            >
                <div className="w-full text-center">
                    <p className="mb-3 text-base md:text-lg text-center font-bold !text-white [.data-theme='light']_&:!text-white">Total music scrobbles</p>
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
                    <p className="mb-3 text-base md:text-lg text-center font-bold !text-white [.data-theme='light']_&:!text-white">Top artists of the week</p>
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
                <p className="mb-3 text-base md:text-lg text-center font-bold [.data-theme='light']_&:!text-black">Daily music scrobbles</p>
                <div className="w-full flex-1 select-none min-h-0">
                    <MusicCharts data={data.weeklyScrobbles} />
                </div>
            </div>

        </div>
    );
});
