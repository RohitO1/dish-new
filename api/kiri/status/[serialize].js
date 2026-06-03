/**
 * Vercel Serverless Function — KIRI Engine Status Polling Proxy
 *
 * GET /api/kiri/status/[serialize]
 *
 * Polls the KIRI Engine processing status for a given task.
 * The browser polls this every 8 seconds until status === 2 (ready).
 *
 * Returns:
 *   { serialize, status, statusText, progress }
 *
 * Status codes from KIRI:
 *   -1  uploading   — video being uploaded
 *    0  processing  — neural reconstruction running
 *    1  failed      — generation failed
 *    2  ready       — model ready ✅
 *    3  queuing     — waiting in queue
 *    4  expired     — task expired, re-upload needed
 */

const KIRI_BASE = 'https://api.kiriengine.app/api/v1/open';

const STATUS_TEXT = {
  '-1': 'uploading',
  '0':  'processing',
  '1':  'failed',
  '2':  'ready',
  '3':  'queuing',
  '4':  'expired',
};

// Synthetic progress percentages for the frontend progress bar
const STATUS_PROGRESS = {
  '-1': 15,
  '3':  25,
  '0':  50,  // Will be animated 30→85 client-side by incrementing each poll
  '2':  100,
  '1':  0,
  '4':  0,
};

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
      `${KIRI_BASE}/model/getStatus?serialize=${encodeURIComponent(serialize)}`,
      { headers: { Authorization: `Bearer ${KIRI_API_KEY}` } }
    );

    const data = await kiriRes.json();

    if (!data.ok) {
      return res.status(502).json({ error: data.msg || 'Failed to get status from KIRI.' });
    }

    const statusNum  = data.data.status;
    const statusText = STATUS_TEXT[String(statusNum)] || 'unknown';
    const progress   = STATUS_PROGRESS[String(statusNum)] ?? 0;

    console.log(`[KIRI status] serialize=${serialize} status=${statusNum} (${statusText})`);

    return res.status(200).json({ serialize, status: statusNum, statusText, progress });

  } catch (err) {
    console.error('[KIRI status] Error:', err.message);
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}
