/**
 * Vercel Serverless Function: /api/tripo-proxy
 * 
 * This proxies all Tripo3D API calls from the browser to avoid CORS issues.
 * The VITE_TRIPO_API_KEY env var must be set in Vercel dashboard.
 */

export const config = { runtime: 'edge' };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-File-Name, X-File-Type',
};

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get('path');
  if (!path) {
    return new Response(JSON.stringify({ error: 'Missing path parameter' }), { 
      status: 400, headers: corsHeaders 
    });
  }

  const API_KEY = process.env.VITE_TRIPO_API_KEY;
  const tripoUrl = `https://api.tripo3d.ai/v2/openapi/${path}`;

  try {
    let fetchBody = undefined;
    let fetchHeaders = new Headers();
    
    // Always attach the authorization token securely
    fetchHeaders.set('Authorization', `Bearer ${API_KEY}`);

    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      
      if (contentType.includes('multipart/form-data')) {
        // Parse the incoming FormData natively using Edge Runtime
        const incomingForm = await req.formData();
        const outgoingForm = new FormData();
        
        // Fix 3: Ensure the field name is exactly "file"
        const file = incomingForm.get('file');
        if (file) {
          outgoingForm.append('file', file, file.name || 'upload.jpg');
        }
        
        const type = incomingForm.get('type');
        if (type) {
          outgoingForm.append('type', type);
        }
        
        fetchBody = outgoingForm;
        
        // FIX 1 & FIX 2: 
        // We DO NOT set 'Content-Type' manually.
        // We DO NOT set 'Content-Length' manually.
        // The fetch API will automatically calculate the boundary and length.
      } else {
        // For non-multipart requests (like JSON tasks), pass body as buffer
        fetchBody = await req.arrayBuffer();
        fetchHeaders.set('Content-Type', contentType);
      }
    }

    // Use native fetch to send the reconstructed FormData
    const upstreamRes = await fetch(tripoUrl, {
      method: req.method,
      headers: fetchHeaders,
      body: fetchBody,
    });

    const data = await upstreamRes.arrayBuffer();

    return new Response(data, {
      status: upstreamRes.status,
      headers: {
        ...corsHeaders,
        'Content-Type': upstreamRes.headers.get('content-type') || 'application/json',
      }
    });
    
  } catch (err) {
    console.error('Tripo Proxy Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, headers: corsHeaders 
    });
  }
}
