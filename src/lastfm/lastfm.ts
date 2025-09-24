interface artistInfoType {
    name?: string;
    count?: string;
    image?: string;
}

interface daily {
    name?: string;
    scrobbles?: number;
}

export default async function lastfm() {
    const apiKey = import.meta.env.PUBLIC__LASTFM_API_KEY;
    const username = import.meta.env.PUBLIC__LASTFM_USERNAME;

    try {
        function getDailyTimestamps(daysAgo: number) {
            const date = new Date();
            const dayNumber = date.getUTCDate();
            date.setUTCDate(date.getUTCDate() - daysAgo);
            date.setUTCHours(0, 0, 0, 0);
            const fromTimestamp = Math.floor(date.getTime() / 1000);
            const toTimestamp = fromTimestamp + 86399;
            // console.log(dayNumber - daysAgo)
            return { from: fromTimestamp, to: toTimestamp, day: dayNumber - daysAgo };
        }

        let weeklyScrobbles: daily[] = [];

        for(let i = 6; i >= 0; i --){
            const { from, to, day } = getDailyTimestamps(i);

            const dailyScrobblesURL = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&from=${from}&to=${to}&api_key=${apiKey}&format=json`
            const dailyScrobblesRes = await fetch(dailyScrobblesURL);
            const dailyScrobblesData = await dailyScrobblesRes.json();

            weeklyScrobbles.push({
                "name": String(day),
                "scrobbles": dailyScrobblesData.recenttracks.track.length ?? 0,
                }
            )
        }

        const upperURL = `http://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${username}&api_key=${apiKey}&format=json`
        const upperRes = await fetch(upperURL);
        const upperStats = await upperRes.json();
        const { playcount, track_count, artist_count, album_count } = upperStats.user;

        // console.log(playcount, track_count, artist_count, album_count);

        /* const toptracksURL = `http://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${username}&period=7day&api_key=${apiKey}&format=json`
        const toptracksRes = await fetch(toptracksURL);
        const toptracksData = await toptracksRes.json();

        console.log(toptracksData); */

        let artistsInfo: artistInfoType[] = []

        const topartistsURL = `http://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${username}&period=7day&api_key=${apiKey}&format=json&limit=5`
        const topartistsRes = await fetch(topartistsURL);
        const topartistsData = await topartistsRes.json();
        topartistsData.topartists.artist.map((artist: artistInfoType) => 
            artistsInfo.push({"name": artist?.name, "count":artist?.playcount, "image": artist?.image?.[0]?.["#text"]})
        )
        
        // console.log(artistsInfo)

        return { weeklyScrobbles, artistsInfo, "upperStats": [playcount, track_count, artist_count, album_count]}

    } catch (error) {
        console.log("Error: ", error)
    }
}