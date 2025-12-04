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
            <div className="flex flex-row justify-center lg:justify-around items-center lg:items-start gap-8 lg:gap-4 px-4 w-full">
                <div className="w-full text-center lg:text-left">
                    <p className="font-thin mb-4 text-sm sm:text-base text-center">Total music scrobbles</p>
                    <div className="flex flex-col justify-center items-center lg:items-center h-full w-full gap-2 text-sm sm:text-base">
                        <p>Play count: {data.upperStatsArray[0]}</p>
                        <p>Track count: {data.upperStatsArray[1]}</p>
                        <p>Artist count: {data.upperStatsArray[2]}</p>
                        <p>Album count: {data.upperStatsArray[3]}</p>
                    </div>
                </div>
                <div className="w-full text-center lg:text-left">
                    <p className="font-thin mb-4 text-sm sm:text-base text-center">Top artists of the week</p>
                    <div className="text-sm sm:text-base">
                        {data.artistsInfo.length > 0 ? (
                            data.artistsInfo.map((artist, index) => (
                                <div key={index} className="flex flex-col sm:flex-row justify-center lg:justify-center items-center lg:items-center h-full w-full gap-1 sm:gap-2 mb-2">
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

            <div className="flex flex-col w-full mt-6 px-4 h-[280px]">
                <p className="mb-2 font-thin text-center text-sm sm:text-base">Daily music scrobbles</p>
                <div className="w-full flex-1 select-none min-h-0">
                    <MusicCharts data={data.weeklyScrobbles} />
                </div>
            </div>
        </div>
    );
}
