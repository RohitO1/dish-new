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

    const upstreamRes = await fetch(tripoUrl, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        // Preserve the original Content-Type boundary for form data
        ...(isFormData ? { 'Content-Type': req.headers.get('content-type') } : { 'Content-Type': 'application/json' }),
      },
      body: req.method === 'POST' ? req.body : undefined,
      duplex: 'half',
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
