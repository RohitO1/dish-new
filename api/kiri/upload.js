/**
 * Vercel Serverless Function — KIRI Engine Video Upload Proxy
 *
 * Receives a video file from the browser and forwards it to the
 * KIRI Engine Featureless Object Scan endpoint.
 *
 * The KIRI_API_KEY NEVER reaches the browser — it lives only here.
 *
 * POST /api/kiri/upload
 * Body: multipart/form-data — fields: video (File), fileFormat (string)
 *
 * Returns: { serialize: "796a6f52..." }
 *
 * Env required:
 *   KIRI_API_KEY — your KIRI Engine API key (starts with kiri-)
 *                  Get one at: https://www.kiriengine.app/api/keys
 */

import { Readable } from 'stream';

const KIRI_BASE = 'https://api.kiriengine.app/api/v1/open';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const config = {
  api: {
    bodyParser: false,          // We stream the raw multipart body straight through
    responseLimit: false,
  },
  maxDuration: 120,             // 2 min — enough for upload + KIRI to accept
};

function setCors(res) {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { setCors(res); return res.status(200).end(); }
  if (req.method !== 'POST')    { setCors(res); return res.status(405).json({ error: 'Method Not Allowed' }); }

  const KIRI_API_KEY = process.env.KIRI_API_KEY;
  if (!KIRI_API_KEY) {
    setCors(res);
    return res.status(500).json({
      error: 'KIRI_API_KEY is not configured. Add it to your Vercel environment variables. ' +
             'Get your key at https://www.kiriengine.app/api/keys',
    });
  }

  // Content-Type from the browser (must be multipart/form-data with boundary)
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    setCors(res);
    return res.status(400).json({ error: 'Expected multipart/form-data request.' });
  }

  try {
    // Stream the raw request body straight through to KIRI Engine.
    // We keep the exact same Content-Type header (including boundary).
    const kiriRes = await fetch(`${KIRI_BASE}/featureless/video`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIRI_API_KEY}`,
        'Content-Type': contentType,
        'Content-Length': req.headers['content-length'] || '',
      },
      // Node's IncomingMessage is a Readable stream — pass it directly
      body: Readable.toWeb(req),
      duplex: 'half',
    });

    const data = await kiriRes.json();
    console.log('[KIRI upload] Response:', JSON.stringify(data));

    if (!data.ok || data.code !== 0) {
      setCors(res);
      return res.status(502).json({ error: data.msg || 'KIRI Engine upload failed.' });
    }

    setCors(res);
    return res.status(200).json({
      serialize:     data.data.serialize,
      calculateType: data.data.calculateType, // 2 = Featureless Object Scan
    });

  } catch (err) {
    console.error('[KIRI upload] Exception:', err);
    setCors(res);
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}
