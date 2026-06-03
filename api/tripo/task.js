/**
 * DEPRECATED — This file previously polled task status from Tripo3D API.
 * The app now uses Hugging Face TripoSR exclusively.
 * All 3D generation is handled synchronously by /api/tripo/generate.js
 *
 * This stub is kept to avoid 404 errors from any cached references.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200);
    for (const [k, v] of Object.entries(corsHeaders)) res.setHeader(k, v);
    return res.end();
  }
  res.status(410); // Gone
  for (const [k, v] of Object.entries(corsHeaders)) res.setHeader(k, v);
  return res.json({
    error: 'This endpoint is no longer used. The app uses Hugging Face TripoSR via /api/tripo/generate.',
  });
}
