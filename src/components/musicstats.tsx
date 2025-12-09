import { useEffect, useState } from 'react';
import MusicCharts from './musiccharts';

interface artistInfoType {
    name?: string;
    count?: string;
}

interface daily {
    name?: string;
    scrobbles?: number;
}

interface MusicStatsData {
    weeklyScrobbles: daily[];
    upperStatsArray: number[];
    artistsInfo: artistInfoType[];
}

export default function MusicStatsClient({ apiKey, username }: { apiKey: string; username: string }) {
    const [data, setData] = useState<MusicStatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const baseUrl = import.meta.env.BASE_URL || '/';
                const apiPath = baseUrl.endsWith('/') ? 'api/music-stats' : '/api/music-stats';
                const response = await fetch(`${baseUrl}${apiPath}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch music stats');
                }

                const musicData = await response.json();
                setData(musicData);
                setError(null);
            } catch (err) {
                setError('Failed to load music stats');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="text-gray-400 text-sm">Loading music stats...</div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="text-red-400 text-sm">{error || 'Failed to load data'}</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full justify-center pb-4 lg:gap-20">
            <div className="flex flex-col md:flex-row justify-center md:justify-around items-center md:items-start gap-12 md:gap-4 px-4 w-full">
                <div className="w-full text-center">
                    <p className="mb-4 text-base md:text-lg text-center font-bold">Total music scrobbles</p>
                    <div className="flex flex-col items-center w-full gap-2 text-sm md:text-base">
                        <p><span className='font-medium'>Play count:</span> <span className="text-gray-400">{data.upperStatsArray[0]}</span></p>
                        <p><span className='font-medium'>Track count:</span> <span className="text-gray-400">{data.upperStatsArray[1]}</span></p>
                        <p><span className='font-medium'>Artist count:</span> <span className="text-gray-400">{data.upperStatsArray[2]}</span></p>
                        <p><span className='font-medium'>Album count:</span> <span className="text-gray-400">{data.upperStatsArray[3]}</span></p>
                    </div>
                </div>
                <div className="w-full text-center">
                    <p className="mb-4 text-base md:text-lg text-center font-bold">Top artists of the week</p>
                    <div className="text-sm md:text-base">
                        {data.artistsInfo.length > 0 ? (
                            data.artistsInfo.map((artist, index) => (
                                <div key={index} className="flex flex-col sm:flex-row justify-center items-center h-full w-full gap-1 sm:gap-2 mb-2">
                                    <div className="flex gap-2">
                                        <p className="font-medium">{artist.name}</p>
                                        <p className="text-gray-400">plays: {artist.count}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-gray-400 text-xs italic">No recent listening data available</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col w-full mt-12 h-[200px]">
                <p className="mb-4 text-base md:text-lg text-center font-bold">Daily music scrobbles</p>
                <div className="w-full flex-1 select-none min-h-0">
                    <MusicCharts data={data.weeklyScrobbles} />
                </div>
            </div>
        </div>
    );
}
