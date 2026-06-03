import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import { FormData as NodeFormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';

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

  // Parse the incoming multipart form from the browser
  const form = new IncomingForm({ keepExtensions: true, maxFileSize: 200 * 1024 * 1024 });
  
  const { files } = await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

  const uploadedFile = files.videoFile?.[0] || files.videoFile;
  if (!uploadedFile) return res.status(400).json({ error: 'No videoFile received.' });

  // Build a new FormData for the KIRI API call (server-to-server, no CORS)
  const kiriForm = new NodeFormData();
  kiriForm.set('videoFile', await fileFromPath(uploadedFile.filepath, 'dish_scan.mp4', { type: 'video/mp4' }));
  kiriForm.set('fileFormat', 'GLB');
  kiriForm.set('calculateType', '2');

  try {
    const kiriRes = await fetch(`${KIRI_BASE}/photo/video`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KIRI_API_KEY}`, ...kiriForm.headers },
      body: kiriForm,
    });

    const data = await kiriRes.json();
    return res.status(kiriRes.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: `KIRI upload error: ${err.message}` });
  } finally {
    // Cleanup temp file
    try { fs.unlinkSync(uploadedFile.filepath); } catch (_) {}
  }
}
