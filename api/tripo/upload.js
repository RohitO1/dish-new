export const config = {
  api: {
    bodyParser: false,
    responseLimit: '20mb',
  },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-File-Name, X-File-Type',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200);
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    return res.end();
  }

  const API_KEY = process.env.VITE_TRIPO_API_KEY;

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    console.log("=== PROXY HIT (UPLOAD) ===");
    console.log("Method:", req.method);
    console.log("Content-Type header:", req.headers['content-type']);
    console.log("Raw body size (bytes):", rawBody.byteLength);

    const fetchHeaders = {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': req.headers['content-type'],
    };

    const tripoResponse = await fetch("https://api.tripo3d.ai/v2/openapi/upload", {
      method: "POST",
      headers: fetchHeaders,
      body: rawBody,
    });

    if (!tripoResponse.ok) {
      const errorBody = await tripoResponse.text().catch(() => 'Unreadable error body');
      console.error("Tripo error status:", tripoResponse.status);
      console.error("Tripo error body:", errorBody);
      
      res.status(tripoResponse.status);
      for (const [key, value] of Object.entries(corsHeaders)) {
        res.setHeader(key, value);
      }
      return res.json({ error: errorBody });
    }

    const data = await tripoResponse.arrayBuffer();
    const outBuffer = Buffer.from(data);

    res.status(tripoResponse.status);
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    res.setHeader('Content-Type', tripoResponse.headers.get('content-type') || 'application/json');
    res.end(outBuffer);
    
  } catch (err) {
    console.error('Tripo Upload Proxy Error:', err);
    res.status(500);
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }
    res.json({ error: err.message });
  }
}
