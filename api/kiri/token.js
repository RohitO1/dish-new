export default function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const KIRI_API_KEY = process.env.KIRI_API_KEY;
  if (!KIRI_API_KEY) {
    return res.status(500).json({ error: 'KIRI_API_KEY is missing on the server.' });
  }

  // Return the key securely to the frontend so it can bypass Vercel's 4.5MB upload limit
  // by uploading the video DIRECTLY to KIRI Engine.
  return res.status(200).json({ token: KIRI_API_KEY });
}
