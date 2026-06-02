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

    // Buffer the ENTIRE request body into an ArrayBuffer
    // This is safe because extracted image frames are < 500KB.
    // Doing this guarantees we pass EXACTLY the same boundary bytes the browser created,
    // and prevents Vercel Edge from using Transfer-Encoding: chunked (which Tripo3D rejects).
    const reqBuffer = req.method === 'POST' ? await req.arrayBuffer() : undefined;

    let fetchHeaders = new Headers();
    for (const [key, value] of req.headers.entries()) {
      // Drop headers that should not be forwarded
      if (!['host', 'connection', 'origin', 'referer', 'content-length'].includes(key.toLowerCase())) {
        fetchHeaders.set(key, value);
      }
    }
    
    // Add API Key
    fetchHeaders.set('Authorization', `Bearer ${API_KEY}`);
    
    // Explicitly set Content-Length to force a non-chunked, fixed-length payload
    if (reqBuffer) {
      fetchHeaders.set('Content-Length', reqBuffer.byteLength.toString());
    }

    const upstreamRes = await fetch(tripoUrl, {
      method: req.method,
      headers: fetchHeaders,
      body: reqBuffer, // Forward raw bytes
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
