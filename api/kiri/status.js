export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const KIRI_API_KEY = process.env.KIRI_API_KEY;
  if (!KIRI_API_KEY) return res.status(500).json({ error: 'KIRI_API_KEY not configured on server.' });

  const { serialize } = req.query;
  if (!serialize) return res.status(400).json({ error: 'serialize param required' });

  try {
    const kiriRes = await fetch(
      `https://api.kiriengine.app/api/v1/open/model/getStatus?serialize=${serialize}`,
      { headers: { 'Authorization': `Bearer ${KIRI_API_KEY}` } }
    );
    const data = await kiriRes.json();
    return res.status(kiriRes.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: `Status check error: ${err.message}` });
  }
}
