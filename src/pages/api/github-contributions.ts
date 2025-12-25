import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const GH_TOKEN = import.meta.env.GH_TOKEN as string;
  const GH_USERNAME = import.meta.env.GH_USERNAME as string;

  if (!GH_TOKEN || !GH_USERNAME) {
    return new Response(JSON.stringify({
      error: 'GitHub credentials not configured'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setDate(today.getDate() - 365);
  oneYearAgo.setHours(0, 0, 0, 0);

  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const from: string = oneYearAgo.toISOString();
  const to: string = todayEnd.toISOString();

  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
                color
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { username: GH_USERNAME, from, to }
      })
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=30'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to fetch GitHub contributions'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
