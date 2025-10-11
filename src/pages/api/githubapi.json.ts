export async function GET() {
  const GH_TOKEN = import.meta.env.GH_TOKEN;
  const GH_USERNAME = import.meta.env.GH_USERNAME;
  
  if (!GH_TOKEN || !GH_USERNAME){
    return new Response(
      JSON.stringify({ error: 'Missing GitHub credentials' }), 
      { status: 500 }
    );
  }
  
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const from = oneYearAgo.toISOString();
  const to = new Date().toISOString();

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

  try{
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
        'Cache-Control': 'max-age=3600'
      }
    });
  } catch (error){
    return new Response(JSON.stringify({ error: 'Failed to fetch' }), {
      status: 500
    });
  }
}
