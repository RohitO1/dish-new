/**
 * Vercel Serverless Function — KIRI Engine Model Download URL Proxy
 *
 * GET /api/kiri/download/[serialize]
 *
 * Fetches the 60-minute download link for a completed KIRI model.
 * Call this only after /api/kiri/status/:id returns status === 2 (ready).
 *
 * Returns:
 *   { serialize, modelUrl, expiresAt }
 *
 * ⚠️ The modelUrl expires in 60 minutes. The frontend immediately
 *    fetches the GLB blob and re-uploads it to Supabase Storage for
 *    a permanent URL.
 */

const KIRI_BASE = 'https://api.kiriengine.app/api/v1/open';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  const { serialize } = req.query;

  if (req.method === 'OPTIONS') {
    for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
    return res.status(200).end();
  }

  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);

  if (!serialize || serialize.length < 8) {
    return res.status(400).json({ error: 'Invalid serialize ID.' });
  }

  const KIRI_API_KEY = process.env.KIRI_API_KEY;
  if (!KIRI_API_KEY) {
    return res.status(500).json({ error: 'KIRI_API_KEY is not configured on the server.' });
  }

  try {
    const kiriRes = await fetch(
      `${KIRI_BASE}/model/getModelZip?serialize=${encodeURIComponent(serialize)}`,
      { headers: { Authorization: `Bearer ${KIRI_API_KEY}` } }
    );

    const data = await kiriRes.json();

    if (!data.ok || data.code !== 0) {
      return res.status(502).json({ error: data.msg || 'Failed to get download link from KIRI.' });
    }

    const modelUrl = data.data.modelUrl;
    console.log(`[KIRI download] serialize=${serialize} — URL issued (expires in 60 min)`);

    return res.status(200).json({
      serialize,
      modelUrl,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

  } catch (err) {
    console.error('[KIRI download] Error:', err.message);
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}
