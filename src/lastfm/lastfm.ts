async function lastfm(){
    const apiKey = import.meta.env.PUBLIC__LASTFM_API_KEY;
    const username = import.meta.env.PUBLIC__LASTFM_USERNAME;
    
    try {
        function getTodaysTimestamps() {
            const now = new Date();
            now.setUTCHours(0, 0, 0, 0);
            const fromTimestamp = Math.floor(now.getTime() / 1000);
            const toTimestamp = fromTimestamp + 86399;
            return { from: fromTimestamp, to: toTimestamp };
        }

        const { from, to } = getTodaysTimestamps();

        const upperURL = `http://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${username}&api_key=${apiKey}&format=json`
        const upperRes = await fetch(upperURL);
        const upperStats = await upperRes.json();
        //const { playcount, track_count, artist_count, album_count } = upperStats;

        const toptracksURL = `http://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${username}&period=7day&api_key=${apiKey}&format=json`
        const toptracksRes = await fetch(toptracksURL);
        const toptracksData = await toptracksRes.json();
        //console.log(toptracksData);

        const topartistsURL = `http://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${username}&period=7day&api_key=${apiKey}&format=json`
        const topartistsRes = await fetch(topartistsURL);
        const topartistsData = await topartistsRes.json();
        //console.log(topartistsData)

        const dailyScrobblesURL = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&from=${from}&to=${to}&api_key=${apiKey}&format=json`
        const dailyScrobblesRes = await fetch(dailyScrobblesURL);
        const dailyScrobblesData = await dailyScrobblesRes.json();
        //console.log(dailyScrobblesData)

    } catch (error) {
        console.log("Error: ", error)
    }
}
