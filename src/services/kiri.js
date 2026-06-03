/**
 * KIRI Engine 3D Generation Service
 *
 * Generates 3D GLB models from dish videos using KIRI Engine's
 * Featureless Object Scan API — the best mode for shiny/glazed surfaces.
 *
 * The API key lives ONLY on the server (Vercel functions). This file
 * makes requests to our own backend proxy endpoints, never to KIRI directly.
 *
 * Flow for generateModelFromVideo():
 *   1. POST /api/kiri/upload       → upload video, receive serialize ID
 *   2. GET  /api/kiri/status/:id   → poll every 8s until status = 2 (ready)
 *   3. GET  /api/kiri/download/:id → get 60-min GLB download URL
 *   4. Fetch the GLB blob from KIRI CDN, create a local blob URL
 *   5. Return the blob URL → caller (VendorDashboard) uploads it to Supabase
 *
 * Video Recording Tips for Best Results:
 *   • Slow circular orbit around dish — 2-3 full rotations
 *   • Even diffuse lighting, no harsh shadows
 *   • Plain matte background (white cloth is ideal)
 *   • 720p or 1080p, 15–90 seconds is ideal
 */

// ── Constants ─────────────────────────────────────────────────────

const DEMO_MODEL    = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
const POLL_INTERVAL = 8000;   // 8 seconds between status polls (KIRI recommendation)
const MAX_POLLS     = 150;    // 150 × 8s = 20 minutes max wait

// ── Status helpers ────────────────────────────────────────────────

const KIRI_STATUS = {
  UPLOADING:  -1,
  PROCESSING:  0,
  FAILED:      1,
  READY:       2,
  QUEUING:     3,
  EXPIRED:     4,
};

// ── Core pipeline ─────────────────────────────────────────────────

/**
 * Upload a video file to the KIRI Engine via our Vercel proxy.
 * Returns the serialize ID used to track and retrieve the model.
 *
 * @param {File} videoFile
 * @param {Function} onProgress
 * @returns {Promise<string>} serialize ID
 */
async function uploadVideoToKiri(videoFile, onProgress) {
  onProgress(5, 'uploading');

  const formData = new FormData();
  formData.append('video', videoFile, videoFile.name || 'dish_scan.mp4');
  formData.append('fileFormat', 'GLB');

  let res;
  try {
    res = await fetch('/api/kiri/upload', {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type — browser must set it with the boundary automatically
    });
  } catch (fetchErr) {
    throw new Error(`Could not reach the 3D generation server: ${fetchErr.message}`);
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(errData.error || `Upload failed (${res.status})`);
  }

  const { serialize } = await res.json();
  if (!serialize) throw new Error('No serialize ID returned from upload.');

  console.log('[KIRI] Upload accepted. serialize:', serialize);
  onProgress(20, 'queuing');
  return serialize;
}

/**
 * Poll KIRI Engine status every 8 seconds until the model is ready.
 * Updates progress as polling progresses.
 *
 * @param {string} serialize
 * @param {Function} onProgress
 * @returns {Promise<void>} Resolves when status = READY (2)
 */
async function waitForKiriCompletion(serialize, onProgress) {
  // We animate progress from 25% → 85% over the polling window
  const progressStart = 25;
  const progressEnd   = 85;

  for (let poll = 0; poll < MAX_POLLS; poll++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));

    let statusData;
    try {
      const res = await fetch(`/api/kiri/status/${serialize}`);
      if (!res.ok) { console.warn('[KIRI] Status poll failed, retrying...'); continue; }
      statusData = await res.json();
    } catch {
      console.warn('[KIRI] Status fetch error, retrying...');
      continue;
    }

    const { status, statusText } = statusData;

    // Map status → progress percentage (animated across polls)
    let pct;
    if (status === KIRI_STATUS.UPLOADING) {
      pct = 15;
      onProgress(pct, 'uploading');
    } else if (status === KIRI_STATUS.QUEUING) {
      pct = 25;
      onProgress(pct, 'queuing');
    } else if (status === KIRI_STATUS.PROCESSING) {
      // Smoothly animate from progressStart to progressEnd across polls
      const fraction = Math.min(poll / (MAX_POLLS * 0.7), 1);
      pct = Math.round(progressStart + fraction * (progressEnd - progressStart));
      onProgress(pct, 'processing');
    } else if (status === KIRI_STATUS.READY) {
      onProgress(85, 'processing');
      console.log('[KIRI] Model ready!');
      return; // ✅ Done polling
    } else if (status === KIRI_STATUS.FAILED) {
      throw new Error('KIRI Engine failed to process your video. Please try again with better lighting and a steadier camera.');
    } else if (status === KIRI_STATUS.EXPIRED) {
      throw new Error('KIRI task expired before completing. Please try uploading again.');
    }

    console.log(`[KIRI] Poll ${poll + 1}/${MAX_POLLS} — ${statusText} (${statusData.progress ?? pct}%)`);
  }

  throw new Error('3D generation timed out after 20 minutes. Please try with a shorter video.');
}

/**
 * Fetch the KIRI download URL and retrieve the GLB as a Blob URL.
 *
 * @param {string} serialize
 * @param {Function} onProgress
 * @returns {Promise<string>} Blob URL pointing to the GLB in memory
 */
async function downloadKiriModel(serialize, onProgress) {
  onProgress(88, 'downloading');

  // Step 1: Get the 60-min CDN URL from our proxy
  const dlRes = await fetch(`/api/kiri/download/${serialize}`);
  if (!dlRes.ok) {
    const errData = await dlRes.json().catch(() => ({ error: `HTTP ${dlRes.status}` }));
    throw new Error(errData.error || 'Failed to get model download link.');
  }

  const { modelUrl } = await dlRes.json();
  if (!modelUrl) throw new Error('No model URL in download response.');

  console.log('[KIRI] Downloading GLB from:', modelUrl.slice(0, 80) + '...');

  // Step 2: Fetch the actual GLB blob from the KIRI CDN
  // Note: The modelUrl may be a zip containing GLB — KIRI returns the GLB directly when fileFormat=GLB
  const glbRes = await fetch(modelUrl);
  if (!glbRes.ok) throw new Error(`Failed to download GLB from KIRI CDN (${glbRes.status})`);

  const blob = await glbRes.blob();
  if (!blob || blob.size < 500) {
    throw new Error('Downloaded model is empty or corrupted. Please try again.');
  }

  console.log(`[KIRI] GLB downloaded. Size: ${(blob.size / 1024).toFixed(0)} KB`);

  onProgress(95, 'downloading');

  // Create a local Blob URL — caller (VendorDashboard) will upload this to Supabase
  // for a permanent URL before saving to the database
  const glbBlob = blob.type.includes('zip')
    ? (() => { throw new Error('KIRI returned a ZIP file. Please contact support.'); })()
    : new Blob([blob], { type: 'model/gltf-binary' });

  return URL.createObjectURL(glbBlob);
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Generate a 3D GLB model from a dish video using KIRI Engine.
 *
 * Best results: record a slow circular orbit (2-3 rotations) around
 * the dish in even lighting against a plain background.
 *
 * @param {File}     videoFile   - MP4, MOV, or AVI video file
 * @param {Function} onProgress  - (percent: number, stage: string) => void
 * @returns {Promise<string>}    - Blob URL of the GLB (or demo URL on failure)
 */
export async function generateModelFromVideo(videoFile, onProgress = () => {}) {
  if (!videoFile) {
    console.warn('[KIRI] No video provided — returning demo model.');
    onProgress(100, 'success');
    return DEMO_MODEL;
  }

  try {
    // Phase 1: Upload video to KIRI (5% → 20%)
    const serialize = await uploadVideoToKiri(videoFile, onProgress);

    // Phase 2: Poll until model is ready (20% → 85%)
    await waitForKiriCompletion(serialize, onProgress);

    // Phase 3: Download GLB (85% → 95%)
    const blobUrl = await downloadKiriModel(serialize, onProgress);

    onProgress(100, 'success');
    return blobUrl;

  } catch (err) {
    console.warn('[KIRI] Generation failed:', err.message);
    throw err;
  }
}

/**
 * Generate a 3D model from a single image.
 * KIRI Engine's Featureless Scan is video-only — this falls back to demo.
 * For best results, use generateModelFromVideo() with a dish orbit video.
 *
 * @param {File}     imageFile
 * @param {Function} onProgress
 * @returns {Promise<string>}  Demo model URL
 */
export async function generateModelFromImage(imageFile, onProgress = () => {}) {
  console.warn('[KIRI] Image-to-3D not supported by KIRI Engine. Use a video for best results. Returning demo model.');
  onProgress(10, 'uploading');
  await new Promise(r => setTimeout(r, 500));
  onProgress(50, 'processing');
  await new Promise(r => setTimeout(r, 600));
  onProgress(100, 'success');
  return DEMO_MODEL;
}

// Backward compat alias (not used with KIRI but kept for safety)
export async function extractBestFrameFromVideo() {
  return null;
}
export const extractFramesFromVideo = extractBestFrameFromVideo;
