/**
 * Vercel Serverless Function — Hugging Face TripoSR Proxy
 * Routes POST requests to Hugging Face Inference API to avoid CORS.
 * Uses VITE_HF_TOKEN (server-side, never exposed to browser).
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200);
    for (const [key, value] of Object.entries(corsHeaders)) res.setHeader(key, value);
    return res.end();
  }

  if (req.method !== 'POST') {
    res.status(405);
    for (const [key, value] of Object.entries(corsHeaders)) res.setHeader(key, value);
    return res.json({ error: 'Method Not Allowed' });
  }

  const HF_TOKEN = process.env.VITE_HF_TOKEN;
  if (!HF_TOKEN) {
    res.status(500);
    for (const [key, value] of Object.entries(corsHeaders)) res.setHeader(key, value);
    return res.json({ error: 'VITE_HF_TOKEN is not configured on Vercel.' });
  }

  try {
    // Collect body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString('utf-8');

    // Forward to HuggingFace TripoSR
    const hfRes = await fetch('https://api-inference.huggingface.co/models/stabilityai/TripoSR', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!hfRes.ok) {
      const errText = await hfRes.text().catch(() => 'Unreadable error');
      console.error('HF API error:', hfRes.status, errText);
      res.status(hfRes.status);
      for (const [key, value] of Object.entries(corsHeaders)) res.setHeader(key, value);
      return res.json({ error: errText });
    }

    // Stream the GLB binary back
    const arrayBuffer = await hfRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.status(200);
    for (const [key, value] of Object.entries(corsHeaders)) res.setHeader(key, value);
    res.setHeader('Content-Type', hfRes.headers.get('content-type') || 'model/gltf-binary');
    res.end(buffer);

  } catch (err) {
    console.error('Generate proxy error:', err);
    res.status(500);
    for (const [key, value] of Object.entries(corsHeaders)) res.setHeader(key, value);
    res.json({ error: err.message });
  }
}
