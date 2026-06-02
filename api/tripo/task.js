export const config = { runtime: 'edge' };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const API_KEY = process.env.VITE_TRIPO_API_KEY;

  try {
    const rawBody = await req.clone().text();
    console.log("=== PROXY HIT (TASK) ===");
    console.log("Method:", req.method);
    console.log("Task Payload:", rawBody);

    const tripoResponse = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: rawBody,
    });

    if (!tripoResponse.ok) {
      const errorBody = await tripoResponse.text().catch(() => 'Unreadable error body');
      console.error("Tripo error status:", tripoResponse.status);
      console.error("Tripo error body:", errorBody);
      
      return new Response(JSON.stringify({ error: errorBody }), { 
        status: tripoResponse.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await tripoResponse.arrayBuffer();

    return new Response(data, {
      status: tripoResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': tripoResponse.headers.get('content-type') || 'application/json',
      }
    });
    
  } catch (err) {
    console.error('Tripo Task Proxy Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}
