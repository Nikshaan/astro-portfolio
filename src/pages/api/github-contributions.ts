import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const GH_TOKEN = import.meta.env.GH_TOKEN as string;
  const GH_USERNAME = import.meta.env.GH_USERNAME as string;

  if (!GH_TOKEN || !GH_USERNAME) {
    return new Response(JSON.stringify({ 
      error: 'GitHub token or username not configured' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const today = new Date();
  
  const from: string = startOfYear.toISOString();
  const to: string = today.toISOString();

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
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Failed to fetch contributions:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch GitHub contributions' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
