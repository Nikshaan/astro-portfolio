import type { APIRoute } from 'astro';

const CACHE_DURATION = 5 * 60 * 1000;
let cachedData: any = null;
let lastFetchTime = 0;

export const GET: APIRoute = async () => {
  const apiKey = import.meta.env.PUBLIC__LASTFM_API_KEY as string;
  const username = import.meta.env.PUBLIC__LASTFM_USERNAME as string;

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
        'Cache-Control': 'public, max-age=300'
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
        .then(res => res.json())
        .then(data => data?.user || { playcount: 0, track_count: 0, artist_count: 0, album_count: 0 })
        .catch(() => ({ playcount: 0, track_count: 0, artist_count: 0, album_count: 0 })),
      
      fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${username}&period=7day&api_key=${apiKey}&format=json&limit=5`)
        .then(res => res.json())
        .then(data => {
          if (!data?.topartists?.artist) return [];
          const artists = Array.isArray(data.topartists.artist) 
            ? data.topartists.artist 
            : [data.topartists.artist];
          return artists.map((artist: any) => ({
            name: artist?.name || 'Unknown Artist',
            count: artist?.playcount || '0',
          })).slice(0, 5);
        })
        .catch(() => []),
      
      ...Array.from({ length: 7 }, (_, i) => {
        const { from, to, day } = getDailyTimestamps(6 - i);
        return fetchDayData(day, from, to);
      })
    ]);

    const result = {
      weeklyScrobbles: dailyData,
      upperStatsArray: [
        userStats.playcount,
        userStats.track_count,
        userStats.artist_count,
        userStats.album_count
      ],
      artistsInfo: topArtists
    };

    cachedData = result;
    lastFetchTime = now;

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch music stats' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
