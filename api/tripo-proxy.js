/**
 * Vercel Serverless Function: /api/tripo-proxy
 * 
 * This proxies all Tripo3D API calls from the browser to avoid CORS issues.
 * The VITE_TRIPO_API_KEY env var must be set in Vercel dashboard.
 */

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '20mb',
  },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-File-Name, X-File-Type',
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200);
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    return res.end();
  }

  const { path } = req.query;
  if (!path) {
    res.status(400);
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    return res.json({ error: 'Missing path parameter' });
  }

  const API_KEY = process.env.VITE_TRIPO_API_KEY;
  const tripoUrl = `https://api.tripo3d.ai/v2/openapi/${path}`;

  try {
    let fetchBody;
    let fetchHeaders = {
      'Authorization': `Bearer ${API_KEY}`
    };

    if (req.method === 'POST') {
      // Step 2 & 3: Read raw bytes since bodyParser is false
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const reqBuffer = Buffer.concat(chunks);
      fetchBody = reqBuffer;

      // Copy headers exactly, ensuring Content-Length is explicitly preserved
      // to prevent Node fetch from switching to chunked encoding.
      for (const [key, value] of Object.entries(req.headers)) {
        if (!['host', 'connection', 'origin', 'referer'].includes(key.toLowerCase())) {
          fetchHeaders[key] = value;
        }
      }
      // Force content-length
      fetchHeaders['Content-Length'] = reqBuffer.length.toString();
      
      console.log(`[PROXY] Forwarding POST to ${path}. Size: ${reqBuffer.length} bytes`);
    } else {
      for (const [key, value] of Object.entries(req.headers)) {
        if (!['host', 'connection', 'origin', 'referer', 'content-length'].includes(key.toLowerCase())) {
          fetchHeaders[key] = value;
        }
      }
    }

    const upstreamRes = await fetch(tripoUrl, {
      method: req.method,
      headers: fetchHeaders,
      body: fetchBody,
    });

    // Step 6: Log and return the EXACT Tripo error body
    if (!upstreamRes.ok) {
      const errorText = await upstreamRes.text().catch(() => 'Failed to read Tripo error body');
      console.error(`[PROXY] Tripo Error (${upstreamRes.status}):`, errorText);
      res.status(upstreamRes.status);
      for (const [key, value] of Object.entries(corsHeaders)) {
        res.setHeader(key, value);
      }
      return res.json({ proxy_error: `Tripo responded with ${upstreamRes.status}`, tripo_message: errorText });
    }

    const data = await upstreamRes.arrayBuffer();
    const outBuffer = Buffer.from(data);

    res.status(upstreamRes.status);
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
    res.end(outBuffer);
    
  } catch (err) {
    console.error('Tripo Proxy Exception:', err);
    res.status(500);
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    res.json({ error: err.message });
  }
}
