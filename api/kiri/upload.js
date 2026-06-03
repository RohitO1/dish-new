import { IncomingForm } from 'formidable';
import fs from 'fs';

export const config = {
  api: { bodyParser: false },
};

const KIRI_BASE = 'https://api.kiriengine.app/api/v1/open';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const KIRI_API_KEY = process.env.KIRI_API_KEY;
  if (!KIRI_API_KEY) return res.status(500).json({ error: 'KIRI_API_KEY not configured on server.' });

  let uploadedFile;
  try {
    // Parse the incoming multipart form from the browser
    const form = new IncomingForm({ keepExtensions: true, maxFileSize: 200 * 1024 * 1024 });

    const { files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    uploadedFile = files.videoFile?.[0] || files.videoFile;
    if (!uploadedFile) return res.status(400).json({ error: 'No videoFile received.' });

    // Read the file and build a standard FormData for the KIRI API (server-to-server, no CORS)
    const fileBuffer = fs.readFileSync(uploadedFile.filepath);
    const blob = new Blob([fileBuffer], { type: 'video/mp4' });

    const kiriForm = new FormData();
    kiriForm.append('videoFile', blob, 'dish_scan.mp4');
    kiriForm.append('fileFormat', 'GLB');
    kiriForm.append('calculateType', '2');

    const kiriRes = await fetch(`${KIRI_BASE}/photo/video`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KIRI_API_KEY}` },
      body: kiriForm,
    });

    const data = await kiriRes.json();
    return res.status(kiriRes.status).json(data);
  } catch (err) {
    console.error('[KIRI Upload Proxy] Error:', err);
    return res.status(500).json({ error: `KIRI upload error: ${err.message}` });
  } finally {
    // Cleanup temp file
    if (uploadedFile?.filepath) {
      try { fs.unlinkSync(uploadedFile.filepath); } catch (_) {}
    }
  }
}
