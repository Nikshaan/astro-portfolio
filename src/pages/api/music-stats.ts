import type { APIRoute } from 'astro';

const CACHE_DURATION = 60 * 1000;
let cachedData: any = null;
let lastFetchTime = 0;

export const prerender = false;

interface LastFmArtist {
  name: string;
  playcount: string;
}

interface LastFmUser {
  playcount: string;
  track_count: string;
  artist_count: string;
  album_count: string;
}

export const GET: APIRoute = async () => {
  const apiKey = (import.meta.env.PUBLIC_LASTFM_API_KEY || import.meta.env.PUBLIC__LASTFM_API_KEY) as string;
  const username = (import.meta.env.PUBLIC_LASTFM_USERNAME || import.meta.env.PUBLIC__LASTFM_USERNAME) as string;

  if (!apiKey || !username) {
    return new Response(JSON.stringify({
      error: 'Last.fm credentials not configured'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const now = Date.now();
  if (cachedData && (now - lastFetchTime) < CACHE_DURATION) {
    return new Response(JSON.stringify(cachedData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=30'
      }
    });
  }

  try {
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getDailyTimestamps = (daysAgo: number) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - daysAgo);
      date.setUTCHours(0, 0, 0, 0);
      const fromTimestamp = Math.floor(date.getTime() / 1000);
      const toTimestamp = fromTimestamp + 86399;
      return { from: fromTimestamp, to: toTimestamp, day: dayLabels[date.getUTCDay()] };
    };

    const fetchDayData = async (day: string, from: number, to: number) => {
      try {
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&from=${from}&to=${to}&api_key=${apiKey}&format=json&limit=200`;
        const res = await fetch(url);

        if (!res.ok) {
          return { name: day, scrobbles: 0 };
        }

        const data = await res.json();

        if (!data?.recenttracks?.track) {
          return { name: day, scrobbles: 0 };
        }

        const tracks = Array.isArray(data.recenttracks.track)
          ? data.recenttracks.track
          : [data.recenttracks.track];

        return { name: day, scrobbles: tracks.length };
      } catch (error) {
        return { name: day, scrobbles: 0 };
      }
    };

    const [userStats, topArtists, ...dailyData] = await Promise.all([
      fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${username}&api_key=${apiKey}&format=json`)
        .then(async res => {
          if (!res.ok) {
            console.error('User Info Fetch Failed:', res.status, res.statusText);
            const text = await res.text();
            console.error('Response:', text);
            throw new Error('Fetch failed');
          }
          return res.json();
        })
        .then((data: any) => {
          const user = data?.user as LastFmUser | undefined;
          if (!user) {
            console.error('User Info Data Missing User field:', data);
          }
          return user || { playcount: "0", track_count: "0", artist_count: "0", album_count: "0" };
        })
        .catch((e) => {
          console.error('User Info Catch Error:', e);
          return { playcount: "0", track_count: "0", artist_count: "0", album_count: "0" };
        }),

      fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${username}&period=7day&api_key=${apiKey}&format=json&limit=5`)
        .then(async res => {
          if (!res.ok) {
            console.error('Top Artists Fetch Failed:', res.status);
            throw new Error('Fetch failed');
          }
          return res.json();
        })
        .then((data: any) => {
          if (!data?.topartists?.artist) {
            console.error('Top Artists Data Missing:', data);
            return [];
          }
          const artists = Array.isArray(data.topartists.artist)
            ? data.topartists.artist
            : [data.topartists.artist];
          return artists.map((artist: LastFmArtist) => ({
            name: artist?.name || 'Unknown Artist',
            count: artist?.playcount || '0',
          })).slice(0, 5);
        })
        .catch((e) => {
          console.error('Top Artists Catch Error:', e);
          return [];
        }),

      ...Array.from({ length: 7 }, (_, i) => {
        const { from, to, day } = getDailyTimestamps(6 - i);
        return fetchDayData(day, from, to);
      })
    ]);

    const result = {
      weeklyScrobbles: dailyData,
      upperStatsArray: [
        parseInt(String(userStats.playcount || 0)),
        parseInt(String(userStats.track_count || 0)),
        parseInt(String(userStats.artist_count || 0)),
        parseInt(String(userStats.album_count || 0))
      ],
      artistsInfo: topArtists
    };

    cachedData = result;
    lastFetchTime = now;

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=30'
      }
    });
  } catch (error: any) {
    console.error('API Route Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch music stats',
      details: error?.message || 'Unknown error',
      stack: import.meta.env.DEV ? error?.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
