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

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDailyTimestamps(daysAgo: number) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - daysAgo);
    date.setUTCHours(0, 0, 0, 0);
    const fromTimestamp = Math.floor(date.getTime() / 1000);
    const toTimestamp = fromTimestamp + 86399;
    return { from: fromTimestamp, to: toTimestamp, day: dayLabels[date.getUTCDay()] };
}

async function fetchMusicStats(apiKey: string, username: string): Promise<MusicStatsData> {
    try {
        const dailyPromises = Array.from({ length: 7 }, (_, i) => {
            const { from, to, day } = getDailyTimestamps(6 - i);
            const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&from=${from}&to=${to}&api_key=${apiKey}&format=json`;
            
            return fetch(url)
                .then(res => res.ok ? res.json() : Promise.reject(`Failed: ${res.status}`))
                .then(data => ({
                    name: String(day),
                    scrobbles: data?.recenttracks?.track?.length ?? 0
                }))
                .catch(error => {
                    console.error(`Error fetching day ${day}:`, error);
                    return { name: String(day), scrobbles: 0 };
                });
        });

        const upperStatsPromise = fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${username}&api_key=${apiKey}&format=json`)
            .then(res => res.ok ? res.json() : Promise.reject(`Stats failed: ${res.status}`))
            .then(data => data.user)
            .catch(error => {
                console.error('Error fetching user stats:', error);
                return { playcount: 0, track_count: 0, artist_count: 0, album_count: 0 };
            });

        const topArtistsPromise = fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${username}&period=7day&api_key=${apiKey}&format=json&limit=5`)
            .then(res => res.ok ? res.json() : Promise.reject(`Artists failed: ${res.status}`))
            .then(data => data?.topartists?.artist?.map((artist: any) => ({
                name: artist?.name,
                count: artist?.playcount,
            })) ?? [])
            .catch(error => {
                console.error('Error fetching top artists:', error);
                return [];
            });

        const [dailyResults, upperStats, topArtists] = await Promise.all([
            Promise.all(dailyPromises),
            upperStatsPromise,
            topArtistsPromise
        ]);

        return {
            weeklyScrobbles: dailyResults,
            artistsInfo: topArtists,
            upperStatsArray: [
                upperStats.playcount,
                upperStats.track_count,
                upperStats.artist_count,
                upperStats.album_count
            ]
        };
    } catch (error) {
        console.error('Error: ', error);
        return {
            weeklyScrobbles: Array.from({ length: 7 }, (_, i) => ({
                name: dayLabels[(new Date().getUTCDay() - (6 - i) + 7) % 7],
                scrobbles: 0
            })),
            upperStatsArray: [0, 0, 0, 0],
            artistsInfo: []
        };
    }
}

export default function MusicStatsClient({ apiKey, username }: { apiKey: string; username: string }) {
    const [data, setData] = useState<MusicStatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const musicData = await fetchMusicStats(apiKey, username);
                setData(musicData);
                setError(null);
            } catch (err) {
                console.error('Failed to load music stats:', err);
                setError('Failed to load music stats');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [apiKey, username]);

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
        <>
            <div className="flex flex-col lg:flex-row justify-center lg:justify-around items-center lg:items-start gap-8 lg:gap-4 mt-5 px-4">
                <div className="w-full lg:w-auto text-center lg:text-left">
                    <p className="font-thin mb-4 text-sm sm:text-base">Total music scrobbles</p>
                    <div className="flex flex-col justify-start items-center lg:items-start h-full w-full gap-2 text-sm sm:text-base">
                        <p>Play count: {data.upperStatsArray[0]}</p>
                        <p>Track count: {data.upperStatsArray[1]}</p>
                        <p>Artist count: {data.upperStatsArray[2]}</p>
                        <p>Album count: {data.upperStatsArray[3]}</p>
                    </div>
                </div>
                <div className="w-full lg:w-auto text-center lg:text-left">
                    <p className="font-thin mb-4 text-sm sm:text-base">Top artists of the week</p>
                    <div className="text-sm sm:text-base">
                        {data.artistsInfo.map((artist, index) => (
                            <div key={index} className="flex flex-col sm:flex-row justify-center lg:justify-start items-center lg:items-start h-full w-full gap-1 sm:gap-2 mb-2">
                                <div className="flex gap-2">
                                    <p className="font-medium">{artist.name}</p>
                                    <p className="text-gray-400">plays: {artist.count}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-col h-[15rem] sm:h-[18rem] lg:h-[20rem] w-full mt-10 px-4">
                <p className="my-4 font-thin text-center text-sm sm:text-base">Daily music scrobbles</p>
                <div className="w-full h-full pr-4 sm:pr-10 lg:px-20 select-none">
                    <MusicCharts data={data.weeklyScrobbles} />
                </div>
            </div>
        </>
    );
}
