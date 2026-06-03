/**
 * Vercel Serverless Function — 3D Generation Status/Health Check
 *
 * NOTE: The primary 3D generation now happens client-side via @gradio/client
 * calling the free stabilityai/TripoSR HuggingFace Space directly.
 * No API key is required.
 *
 * This endpoint is kept as a health check so the frontend can verify
 * the 3D generation system is configured.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    for (const [k, v] of Object.entries(corsHeaders)) res.setHeader(k, v);
    return res.status(200).end();
  }

  for (const [k, v] of Object.entries(corsHeaders)) res.setHeader(k, v);

  // Health check — verify the TripoSR Space is reachable
  if (req.method === 'GET') {
    try {
      const checkRes = await fetch('https://stabilityai-triposr.hf.space/info', {
        signal: AbortSignal.timeout(5000),
      });
      return res.status(200).json({
        status: 'ok',
        provider: 'HuggingFace TripoSR Space (free)',
        space_status: checkRes.ok ? 'running' : 'unavailable',
        message: '3D generation runs client-side via @gradio/client — no API key needed.',
      });
    } catch (err) {
      return res.status(200).json({
        status: 'ok',
        provider: 'HuggingFace TripoSR Space (free)',
        space_status: 'unknown',
        message: '3D generation runs client-side via @gradio/client — no API key needed.',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed. 3D generation now runs client-side.' });
}
