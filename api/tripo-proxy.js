/**
 * Vercel Serverless Function: /api/tripo-proxy
 * 
 * This proxies all Tripo3D API calls from the browser to avoid CORS issues.
 * The VITE_TRIPO_API_KEY env var must be set in Vercel dashboard.
 */

export const config = { runtime: 'edge' };

const corsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-File-Name, X-File-Type',
});

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders() });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get('path');
  if (!path) {
    return new Response(JSON.stringify({ error: 'Missing path parameter' }), { status: 400 });
  }

  const API_KEY = process.env.VITE_TRIPO_API_KEY;
  const tripoUrl = `https://api.tripo3d.ai/v2/openapi/${path}`;

  try {
    let fetchBody;
    let fetchHeaders = new Headers();
    fetchHeaders.set('Authorization', `Bearer ${API_KEY}`);

    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      
      if (contentType.includes('application/octet-stream')) {
        // Construct FormData internally to avoid pass-through corruption!
        // Edge fetch can send FormData perfectly, it just can't forward an existing stream perfectly.
        const reqBuffer = await req.arrayBuffer();
        const blob = new Blob([reqBuffer], { type: 'application/octet-stream' });
        
        const fileName = req.headers.get('x-file-name') || 'upload.jpg';
        const fileType = req.headers.get('x-file-type') || 'image';
        
        const form = new FormData();
        form.append('file', blob, fileName);
        form.append('type', fileType);
        
        fetchBody = form;
      } else {
        // Buffer normal JSON requests
        fetchBody = await req.arrayBuffer();
        for (const [key, value] of req.headers.entries()) {
          if (!['host', 'connection', 'origin', 'referer', 'content-length'].includes(key.toLowerCase())) {
            fetchHeaders.set(key, value);
          }
        }
      }
    } else {
      for (const [key, value] of req.headers.entries()) {
        if (!['host', 'connection', 'origin', 'referer', 'content-length'].includes(key.toLowerCase())) {
          fetchHeaders.set(key, value);
        }
      }
    }

    const upstreamRes = await fetch(tripoUrl, {
      method: req.method,
      headers: fetchHeaders,
      body: fetchBody,
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
    console.error('Tripo Proxy Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: corsHeaders() 
    });
  }
}
