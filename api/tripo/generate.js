/**
 * Vercel Serverless Function — Hugging Face TripoSR Proxy
 * Replaces all Tripo3D API calls. Routes POST requests to the Hugging Face
 * Inference API to avoid browser CORS restrictions.
 *
 * Env var required (set in Vercel dashboard):
 *   VITE_HF_TOKEN  — your free Hugging Face token
 *                    https://huggingface.co/settings/tokens
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200);
    for (const [k, v] of Object.entries(corsHeaders)) res.setHeader(k, v);
    return res.end();
  }

  if (req.method !== 'POST') {
    res.status(405);
    for (const [k, v] of Object.entries(corsHeaders)) res.setHeader(k, v);
    return res.json({ error: 'Method Not Allowed' });
  }

  const HF_TOKEN = process.env.VITE_HF_TOKEN;
  if (!HF_TOKEN) {
    res.status(500);
    for (const [k, v] of Object.entries(corsHeaders)) res.setHeader(k, v);
    return res.json({ error: 'VITE_HF_TOKEN is not configured. Add it to your Vercel environment variables.' });
  }

  try {
    // Collect request body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString('utf-8');

    // Forward to Hugging Face TripoSR
    const hfRes = await fetch(
      'https://api-inference.huggingface.co/models/stabilityai/TripoSR',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body,
      }
    );

    if (!hfRes.ok) {
      const errText = await hfRes.text().catch(() => 'Unreadable error from Hugging Face');
      console.error('[HF TripoSR] API error:', hfRes.status, errText);
      res.status(hfRes.status);
      for (const [k, v] of Object.entries(corsHeaders)) res.setHeader(k, v);
      return res.json({ error: `Hugging Face TripoSR responded with ${hfRes.status}: ${errText}` });
    }

    // Stream the GLB binary back to the browser
    const arrayBuffer = await hfRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.status(200);
    for (const [k, v] of Object.entries(corsHeaders)) res.setHeader(k, v);
    res.setHeader('Content-Type', hfRes.headers.get('content-type') || 'model/gltf-binary');
    res.end(buffer);

  } catch (err) {
    console.error('[HF TripoSR] Proxy exception:', err);
    res.status(500);
    for (const [k, v] of Object.entries(corsHeaders)) res.setHeader(k, v);
    res.json({ error: err.message });
  }
}
