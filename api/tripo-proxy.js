/**
 * Vercel Serverless Function: /api/tripo-proxy
 * 
 * This proxies all Tripo3D API calls from the browser to avoid CORS issues.
 * The VITE_TRIPO_API_KEY env var must be set in Vercel dashboard.
 */

export const config = {
  api: {
    bodyParser: false, // Disables Vercel's default body parsing so we can read the raw stream
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
      const contentType = req.headers['content-type'] || '';
      
      // Read the entire raw body stream
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const reqBuffer = Buffer.concat(chunks);

      if (contentType.includes('application/octet-stream')) {
        const fileName = req.headers['x-file-name'] || 'upload.jpg';
        const fileType = req.headers['x-file-type'] || 'image';
        
        const boundary = '----Boundary' + Math.random().toString(36).substring(2);
        
        const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: image/jpeg\r\n\r\n`;
        const footer = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\n${fileType}\r\n--${boundary}--\r\n`;
        
        const headerBytes = Buffer.from(header, 'utf-8');
        const footerBytes = Buffer.from(footer, 'utf-8');
        
        const bodyBytes = Buffer.concat([headerBytes, reqBuffer, footerBytes]);
        
        fetchHeaders['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
        fetchHeaders['Content-Length'] = bodyBytes.length.toString();
        fetchBody = bodyBytes;
      } else {
        // Buffer normal JSON requests
        fetchBody = reqBuffer;
        for (const [key, value] of Object.entries(req.headers)) {
          if (!['host', 'connection', 'origin', 'referer', 'content-length'].includes(key.toLowerCase())) {
            fetchHeaders[key] = value;
          }
        }
      }
    } else {
      for (const [key, value] of Object.entries(req.headers)) {
        if (!['host', 'connection', 'origin', 'referer', 'content-length'].includes(key.toLowerCase())) {
          fetchHeaders[key] = value;
        }
      }
    }

    // Use native fetch to send exactly the bytes we constructed
    const upstreamRes = await fetch(tripoUrl, {
      method: req.method,
      headers: fetchHeaders,
      body: fetchBody,
    });

    const data = await upstreamRes.arrayBuffer();
    const outBuffer = Buffer.from(data);

    res.status(upstreamRes.status);
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
    res.end(outBuffer);
    
  } catch (err) {
    console.error('Tripo Proxy Error:', err);
    res.status(500);
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    res.json({ error: err.message });
  }
}
