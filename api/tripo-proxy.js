/**
 * Vercel Serverless Function: /api/tripo-proxy
 * 
 * This proxies all Tripo3D API calls from the browser to avoid CORS issues.
 * The VITE_TRIPO_API_KEY env var must be set in Vercel dashboard.
 */

export const config = { runtime: 'edge' };

const TRIPO_BASE = 'https://api.tripo3d.ai/v2/openapi';
const API_KEY = process.env.VITE_TRIPO_API_KEY || '';

export default async function handler(req) {
  // Only allow POST and GET
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders()
    });
  }

  // Get the target path from query: e.g. /api/tripo-proxy?path=task/abc123
  const url = new URL(req.url);
  const tripoPath = url.searchParams.get('path') || '';
  const tripoUrl = `${TRIPO_BASE}/${tripoPath}`;

  if (!API_KEY) {
    return new Response(JSON.stringify({ error: 'VITE_TRIPO_API_KEY not configured on server' }), {
      status: 500,
      headers: corsHeaders()
    });
  }

  try {
    const isFormData = req.headers.get('content-type')?.includes('multipart');

    let fetchBody = req.method === 'POST' ? req.body : undefined;
    let fetchHeaders = new Headers();

    if (isFormData && req.method === 'POST') {
      // Natively parse and reconstruct the form data. 
      // Fetch will automatically generate the correct Content-Type with a valid boundary.
      fetchBody = await req.formData();
      fetchHeaders.set('Authorization', `Bearer ${API_KEY}`);
    } else {
      // Normal JSON / other requests proxy
      for (const [key, value] of req.headers.entries()) {
        if (!['host', 'connection', 'origin', 'referer', 'content-length'].includes(key.toLowerCase())) {
          fetchHeaders.set(key, value);
        }
      }
      fetchHeaders.set('Authorization', `Bearer ${API_KEY}`);
    }

    const upstreamRes = await fetch(tripoUrl, {
      method: req.method,
      headers: fetchHeaders,
      body: fetchBody,
      duplex: fetchBody && !(fetchBody instanceof FormData) ? 'half' : undefined,
    });

    const data = await upstreamRes.arrayBuffer();

    return new Response(data, {
      status: upstreamRes.status,
      headers: {
        ...corsHeaders(),
        'Content-Type': upstreamRes.headers.get('content-type') || 'application/json',
      }
    });
  } catch (err) {
    console.error('Tripo proxy error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders()
    });
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
}
