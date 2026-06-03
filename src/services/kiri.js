import { unzipSync } from 'fflate';

/**
 * KIRI Engine 3D Generation Service
 *
 * All KIRI API calls are routed through Vercel serverless proxy functions
 * (/api/kiri/upload, /api/kiri/status, /api/kiri/download) so the browser
 * never directly contacts api.kiriengine.app — eliminating all CORS errors.
 */

const DEMO_MODEL    = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
const POLL_INTERVAL = 8000;   // 8 seconds between polls
const MAX_POLLS     = 150;    // 150 × 8s = 20 min max

const KIRI_STATUS = {
  UPLOADING:  -1,
  PROCESSING:  0,
  FAILED:      1,
  READY:       2,
  QUEUING:     3,
  EXPIRED:     4,
};

// ── Core pipeline ─────────────────────────────────────────────────

async function uploadVideoToKiri(videoFile, onProgress) {
  onProgress(5, 'uploading');

  const formData = new FormData();
  formData.append('videoFile', videoFile, 'dish_scan.mp4');

  // POST to our own Vercel proxy — no CORS, no browser restrictions
  const res = await fetch('/api/kiri/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(errData.error || errData.msg || `Upload failed (${res.status})`);
  }

  const data = await res.json();
  if (!data.ok) {
    const errorMsg = (data.msg && data.msg.toLowerCase() !== 'success')
      ? data.msg
      : `KIRI API Error (Code: ${data.code})`;
    throw new Error(errorMsg);
  }

  console.log('[KIRI] Upload accepted. serialize:', data.data.serialize);
  onProgress(20, 'queuing');
  return data.data.serialize;
}

async function waitForKiriCompletion(serialize, onProgress) {
  const progressStart = 25;
  const progressEnd   = 85;

  for (let poll = 0; poll < MAX_POLLS; poll++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));

    let data;
    try {
      const res = await fetch(`/api/kiri/status?serialize=${serialize}`);
      if (!res.ok) continue;
      data = await res.json();
    } catch {
      continue;
    }

    if (!data.ok) throw new Error(data.msg || 'Status check failed.');
    const status = data.data.status;

    if (status === KIRI_STATUS.UPLOADING) {
      onProgress(15, 'uploading');
    } else if (status === KIRI_STATUS.QUEUING) {
      onProgress(25, 'queuing');
    } else if (status === KIRI_STATUS.PROCESSING) {
      const fraction = Math.min(poll / (MAX_POLLS * 0.7), 1);
      const pct = Math.round(progressStart + fraction * (progressEnd - progressStart));
      onProgress(pct, 'processing');
    } else if (status === KIRI_STATUS.READY) {
      onProgress(85, 'processing');
      return;
    } else if (status === KIRI_STATUS.FAILED) {
      throw new Error('KIRI Engine failed to process the video. Please try with better lighting and a steadier camera.');
    } else if (status === KIRI_STATUS.EXPIRED) {
      throw new Error('KIRI task expired. Please try uploading again.');
    }
  }

  throw new Error('3D generation timed out after 20 minutes. Try a shorter video.');
}

async function downloadKiriModel(serialize, onProgress) {
  onProgress(88, 'downloading');

  const dlRes = await fetch(`/api/kiri/download?serialize=${serialize}`);
  if (!dlRes.ok) throw new Error(`Failed to get model download link (HTTP ${dlRes.status}).`);

  const data = await dlRes.json();
  if (!data.ok) {
    const errorMsg = (data.msg && data.msg.toLowerCase() !== 'success')
      ? data.msg
      : `KIRI API Error (Code: ${data.code})`;
    throw new Error(errorMsg);
  }
  const modelUrl = data.data.modelUrl;

  // Download the actual ZIP from KIRI's CDN (this is a plain CDN, no auth — no CORS issue)
  const zipRes = await fetch(modelUrl);
  if (!zipRes.ok) throw new Error(`Failed to download ZIP from KIRI CDN (${zipRes.status})`);

  const arrayBuffer = await zipRes.arrayBuffer();
  if (!arrayBuffer || arrayBuffer.byteLength < 500) throw new Error('Downloaded model is empty or corrupted.');

  onProgress(95, 'downloading');

  const unzipped = unzipSync(new Uint8Array(arrayBuffer));
  const glbFilename = Object.keys(unzipped).find(name =>
    name.toLowerCase().endsWith('.glb') ||
    name.toLowerCase().endsWith('.gltf') ||
    name.toLowerCase().endsWith('.obj')
  );

  if (!glbFilename) throw new Error('No 3D model found inside the downloaded ZIP file.');

  const glbBlob = new Blob([unzipped[glbFilename]], { type: 'model/gltf-binary' });
  return URL.createObjectURL(glbBlob);
}

// ── Public API ────────────────────────────────────────────────────

export async function generateModelFromVideo(videoFile, onProgress = () => {}) {
  if (!videoFile) {
    onProgress(100, 'success');
    return DEMO_MODEL;
  }

  try {
    const serialize = await uploadVideoToKiri(videoFile, onProgress);
    await waitForKiriCompletion(serialize, onProgress);
    const blobUrl = await downloadKiriModel(serialize, onProgress);
    onProgress(100, 'success');
    return blobUrl;
  } catch (err) {
    console.warn('[KIRI] Generation failed:', err.message);
    throw err;
  }
}

export async function generateModelFromImage(imageFile, onProgress = () => {}) {
  console.warn('[KIRI] Image-to-3D not supported. Returning demo.');
  onProgress(10, 'uploading');
  await new Promise(r => setTimeout(r, 500));
  onProgress(50, 'processing');
  await new Promise(r => setTimeout(r, 600));
  onProgress(100, 'success');
  return DEMO_MODEL;
}

export async function extractBestFrameFromVideo() { return null; }
export const extractFramesFromVideo = extractBestFrameFromVideo;
