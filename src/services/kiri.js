import { unzipSync } from 'fflate';

/**
 * KIRI Engine 3D Generation Service
 *
 * Generates 3D GLB models from dish videos using KIRI Engine's
 * Featureless Object Scan API — the best mode for shiny/glazed surfaces.
 *
 * Bypasses Vercel's 4.5MB serverless limit by securely fetching the API token
 * from our backend, then uploading the video DIRECTLY from the browser to KIRI.
 */

const DEMO_MODEL    = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
const KIRI_BASE     = 'https://api.kiriengine.app/api/v1/open';
const POLL_INTERVAL = 8000;   // 8 seconds between status polls (KIRI recommendation)
const MAX_POLLS     = 150;    // 150 × 8s = 20 minutes max wait

const KIRI_STATUS = {
  UPLOADING:  -1,
  PROCESSING:  0,
  FAILED:      1,
  READY:       2,
  QUEUING:     3,
  EXPIRED:     4,
};

// --- Shared Token Cache ---
let cachedToken = null;

async function getKiriToken() {
  if (cachedToken) return cachedToken;
  const res = await fetch('/api/kiri/token');
  if (!res.ok) throw new Error('Failed to retrieve secure API token for 3D generation.');
  const data = await res.json();
  if (!data.token) throw new Error('API token missing in backend configuration.');
  cachedToken = data.token;
  return cachedToken;
}

// ── Core pipeline ─────────────────────────────────────────────────

async function uploadVideoToKiri(videoFile, token, onProgress) {
  onProgress(5, 'uploading');

  const formData = new FormData();
  formData.append('videoFile', videoFile, videoFile.name || 'dish_scan.mp4');
  formData.append('fileFormat', 'GLB');

  const res = await fetch(`${KIRI_BASE}/featureless/video`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ msg: `HTTP ${res.status}` }));
    throw new Error(errData.msg || `Upload failed (${res.status})`);
  }

  const data = await res.json();
  if (!data.ok || data.code !== 0) throw new Error(data.msg || 'KIRI upload rejected.');
  
  console.log('[KIRI] Upload accepted. serialize:', data.data.serialize);
  onProgress(20, 'queuing');
  return data.data.serialize;
}

async function waitForKiriCompletion(serialize, token, onProgress) {
  const progressStart = 25;
  const progressEnd   = 85;

  for (let poll = 0; poll < MAX_POLLS; poll++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));

    let data;
    try {
      const res = await fetch(`${KIRI_BASE}/model/getStatus?serialize=${serialize}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) continue;
      data = await res.json();
    } catch {
      continue;
    }

    if (!data.ok) throw new Error(data.msg || 'Status check failed.');
    const status = data.data.status;

    let pct;
    if (status === KIRI_STATUS.UPLOADING) {
      pct = 15; onProgress(pct, 'uploading');
    } else if (status === KIRI_STATUS.QUEUING) {
      pct = 25; onProgress(pct, 'queuing');
    } else if (status === KIRI_STATUS.PROCESSING) {
      const fraction = Math.min(poll / (MAX_POLLS * 0.7), 1);
      pct = Math.round(progressStart + fraction * (progressEnd - progressStart));
      onProgress(pct, 'processing');
    } else if (status === KIRI_STATUS.READY) {
      onProgress(85, 'processing');
      return; 
    } else if (status === KIRI_STATUS.FAILED) {
      throw new Error('KIRI Engine failed to process your video. Please try again with better lighting and a steadier camera.');
    } else if (status === KIRI_STATUS.EXPIRED) {
      throw new Error('KIRI task expired before completing. Please try uploading again.');
    }
  }

  throw new Error('3D generation timed out after 20 minutes. Please try with a shorter video.');
}

async function downloadKiriModel(serialize, token, onProgress) {
  onProgress(88, 'downloading');

  const dlRes = await fetch(`${KIRI_BASE}/model/getModelZip?serialize=${serialize}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!dlRes.ok) throw new Error(`Failed to get model download link (HTTP ${dlRes.status}).`);
  
  const data = await dlRes.json();
  if (!data.ok || data.code !== 0) throw new Error(data.msg || 'Failed to get download URL.');
  const modelUrl = data.data.modelUrl;

  const zipRes = await fetch(modelUrl);
  if (!zipRes.ok) throw new Error(`Failed to download ZIP from KIRI CDN (${zipRes.status})`);

  const arrayBuffer = await zipRes.arrayBuffer();
  if (!arrayBuffer || arrayBuffer.byteLength < 500) throw new Error('Downloaded model is empty or corrupted.');

  onProgress(95, 'downloading');

  try {
    // Unzip the downloaded array buffer
    const unzipped = unzipSync(new Uint8Array(arrayBuffer));
    
    // Find the GLB file (could be named anything inside the zip)
    const glbFilename = Object.keys(unzipped).find(name => 
      name.toLowerCase().endsWith('.glb') || 
      name.toLowerCase().endsWith('.gltf') || 
      name.toLowerCase().endsWith('.obj')
    );
    
    if (!glbFilename) throw new Error('No 3D model found inside the downloaded ZIP file.');
    
    const fileData = unzipped[glbFilename];
    const glbBlob = new Blob([fileData], { type: 'model/gltf-binary' });
    return URL.createObjectURL(glbBlob);
  } catch (err) {
    throw new Error('Failed to extract the 3D model from the ZIP file: ' + err.message);
  }
}

// ── Public API ────────────────────────────────────────────────────

export async function generateModelFromVideo(videoFile, onProgress = () => {}) {
  if (!videoFile) {
    onProgress(100, 'success');
    return DEMO_MODEL;
  }

  try {
    const token = await getKiriToken();
    const serialize = await uploadVideoToKiri(videoFile, token, onProgress);
    await waitForKiriCompletion(serialize, token, onProgress);
    const blobUrl = await downloadKiriModel(serialize, token, onProgress);
    onProgress(100, 'success');
    return blobUrl;
  } catch (err) {
    console.warn('[KIRI] Generation failed:', err.message);
    throw err;
  }
}

export async function generateModelFromImage(imageFile, onProgress = () => {}) {
  console.warn('[KIRI] Image-to-3D not supported by KIRI. Returning demo.');
  onProgress(10, 'uploading');
  await new Promise(r => setTimeout(r, 500));
  onProgress(50, 'processing');
  await new Promise(r => setTimeout(r, 600));
  onProgress(100, 'success');
  return DEMO_MODEL;
}

export async function extractBestFrameFromVideo() { return null; }
export const extractFramesFromVideo = extractBestFrameFromVideo;
