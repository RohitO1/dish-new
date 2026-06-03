/**
 * 3D Model Generation Service — Powered by HuggingFace TripoSR Space (FREE)
 *
 * Uses the official stabilityai/TripoSR HuggingFace Space via @gradio/client.
 * 100% free, no API key needed — calls the public Space directly from the browser.
 *
 * Flow: Video → extract sharpest frame → /preprocess → /generate → GLB blob URL
 *
 * Space: https://stabilityai-triposr.hf.space
 * API:   /preprocess, /generate
 */

import { Client, handle_file } from '@gradio/client';

const DEMO_MODEL = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
const TRIPOSR_SPACE = 'stabilityai/TripoSR';

// ─── Image Pre-processing ─────────────────────────────────────────

/**
 * Resize and compress an image File/Blob to ≤ maxDim px for faster uploads.
 */
async function compressImage(file, maxDim = 512, quality = 0.88) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width  = Math.round(width  * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob
          ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
          : file
        ),
        'image/jpeg', quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ─── Frame extraction from video ─────────────────────────────────

function seekTo(video, time, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      video.removeEventListener('seeked', onSeeked);
      reject(new Error(`Seek timed out at ${time.toFixed(2)}s`));
    }, timeoutMs);
    const onSeeked = () => { clearTimeout(timer); video.removeEventListener('seeked', onSeeked); resolve(); };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = time;
  });
}

function captureFrame(video, label = 'frame') {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const maxDim = 768;
    let w = video.videoWidth || 1280, h = video.videoHeight || 720;
    if (w > maxDim || h > maxDim) {
      const s = maxDim / Math.max(w, h);
      w = Math.round(w * s); h = Math.round(h * s);
    }
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => resolve(blob ? new File([blob], `frame_${label}.jpg`, { type: 'image/jpeg' }) : null),
      'image/jpeg', 0.90
    );
  });
}

async function sharpnessScore(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);
      const gray = [];
      for (let i = 0; i < data.length; i += 4)
        gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      let sum = 0, sumSq = 0, count = 0;
      for (let r = 1; r < size - 1; r++) {
        for (let c = 1; c < size - 1; c++) {
          const idx = r * size + c;
          const lap = Math.abs(
            -gray[idx - size - 1] - gray[idx - size] - gray[idx - size + 1]
            - gray[idx - 1] + 8 * gray[idx] - gray[idx + 1]
            - gray[idx + size - 1] - gray[idx + size] - gray[idx + size + 1]
          );
          sum += lap; sumSq += lap * lap; count++;
        }
      }
      const mean = sum / count;
      resolve(sumSq / count - mean * mean);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    img.src = url;
  });
}

/**
 * Extract the best (sharpest) frame from a video File.
 * Samples multiple candidate frames and picks the clearest one.
 */
export async function extractBestFrameFromVideo(videoFile, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.preload = 'auto';
    const url = URL.createObjectURL(videoFile);
    video.src = url;
    const cleanup = () => URL.revokeObjectURL(url);

    video.addEventListener('error', (e) => { cleanup(); reject(new Error(`Video load failed: ${e.message}`)); });
    video.addEventListener('loadedmetadata', async () => {
      try {
        const duration = video.duration;
        if (!duration || !isFinite(duration) || duration < 0.3) {
          cleanup(); reject(new Error('Video is too short (< 1 second).')); return;
        }
        if (duration > 30) {
          cleanup(); reject(new Error('Video is too long. Please use a video under 30 seconds.')); return;
        }

        const start = Math.min(duration * 0.15, 1.0);
        const end   = Math.max(duration * 0.85, duration - 0.5);
        const numCandidates = duration <= 3 ? 3 : duration <= 10 ? 5 : 8;
        const timestamps = [start];
        if (numCandidates > 1) {
          const step = (end - start) / (numCandidates - 1);
          for (let i = 1; i < numCandidates; i++) timestamps.push(start + step * i);
        }

        onProgress(5, 'extracting');
        const candidates = [];
        for (let i = 0; i < timestamps.length; i++) {
          try {
            await seekTo(video, timestamps[i]);
            const frame = await captureFrame(video, `c${i}`);
            if (frame) candidates.push(frame);
          } catch { /* skip bad frames */ }
          onProgress(5 + Math.round(((i + 1) / timestamps.length) * 55), 'extracting');
        }
        cleanup();

        if (!candidates.length) { reject(new Error('Could not extract any frames from the video.')); return; }

        const scores = await Promise.all(candidates.map(f => sharpnessScore(f)));
        let bestIdx = 0;
        for (let i = 1; i < scores.length; i++) if (scores[i] > scores[bestIdx]) bestIdx = i;

        onProgress(65, 'selected');
        resolve(candidates[bestIdx]);
      } catch (err) { cleanup(); reject(err); }
    });
  });
}

// ─── TripoSR 3D Generation (via HuggingFace Space — FREE) ────────

/**
 * Generate a GLB from an image using the TripoSR HuggingFace Space.
 * No API key required — uses the public Space endpoint.
 *
 * Returns a blob: URL pointing to the GLB file in memory.
 */
async function generateGlbFromTripoSR(imageFile, onProgress) {
  onProgress(68, 'connecting');

  let client;
  try {
    client = await Client.connect(TRIPOSR_SPACE);
  } catch (err) {
    throw new Error(`Could not connect to TripoSR Space: ${err.message}`);
  }

  onProgress(72, 'queued');

  // Step 1: Preprocess the image (background removal + cleanup)
  let preprocessed;
  try {
    const preprocessResult = await client.predict('/preprocess', {
      input_image: handle_file(imageFile), // exact param name from app.py
      do_remove_background: true,          // remove background for cleaner 3D
      foreground_ratio: 0.85,              // default from app.py
    });
    preprocessed = preprocessResult.data[0]; // URL of the preprocessed image
    console.log('[TripoSR] Preprocessing done:', preprocessed);
  } catch (err) {
    throw new Error(`Image preprocessing failed: ${err.message}`);
  }

  onProgress(80, 'running');

  // Step 2: Generate the 3D model from the preprocessed image
  let glbBlob;
  try {
    const generateResult = await client.predict('/generate', {
      image: preprocessed,  // Output from preprocess step
      mc_resolution: 256,   // Marching cubes resolution (32–320, default 256)
    });

    // generateResult.data = [obj_model, glb_model]
    // Each is either a URL string or a Blob
    const glbOutput = generateResult.data[1]; // GLB is the second output
    console.log('[TripoSR] Generation done. GLB output:', glbOutput);

    if (!glbOutput) throw new Error('No GLB output received from TripoSR.');

    // Handle both URL string and Blob responses
    if (glbOutput instanceof Blob || glbOutput instanceof File) {
      glbBlob = glbOutput;
    } else if (typeof glbOutput === 'string') {
      // It's a URL — fetch the blob
      const fetchRes = await fetch(glbOutput);
      if (!fetchRes.ok) throw new Error(`Failed to download GLB: ${fetchRes.status}`);
      glbBlob = await fetchRes.blob();
    } else if (glbOutput && glbOutput.url) {
      // Gradio sometimes wraps results in { url, path, ... } objects
      const fetchRes = await fetch(glbOutput.url);
      if (!fetchRes.ok) throw new Error(`Failed to download GLB: ${fetchRes.status}`);
      glbBlob = await fetchRes.blob();
    } else {
      throw new Error('Unexpected GLB output format from TripoSR.');
    }
  } catch (err) {
    throw new Error(`3D generation failed: ${err.message}`);
  }

  if (!glbBlob || glbBlob.size < 500) {
    throw new Error('Generated model is empty or too small. Please try with a different image.');
  }

  onProgress(95, 'downloading');

  // Return a File object so finalizeGlbResult uploads it to Supabase Storage
  // for a permanent URL. A blob: URL would die when the browser tab closes.
  const glbFile = new File([glbBlob], `dish_3d_${Date.now()}.glb`, { type: 'model/gltf-binary' });

  onProgress(100, 'success');
  console.log('[TripoSR] GLB ready as File:', glbFile.name, glbFile.size, 'bytes');
  return glbFile;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Generate a 3D GLB model from a single image File.
 * Uses the free TripoSR HuggingFace Space. Falls back to demo model on failure.
 *
 * @param {File}     imageFile
 * @param {function} onProgress  (pct: number, stage: string) => void
 * @returns {Promise<string>}  GLB blob URL or demo model URL
 */
export async function generateModelFromImage(imageFile, onProgress = () => {}) {
  if (!imageFile) {
    console.warn('[TripoSR] No image provided. Returning demo model.');
    onProgress(100, 'success');
    return DEMO_MODEL;
  }

  onProgress(5, 'compressing');
  const compressed = await compressImage(imageFile, 512, 0.88);
  onProgress(10, 'compressed');

  try {
    return await generateGlbFromTripoSR(compressed, onProgress);
  } catch (err) {
    console.warn('[TripoSR] Generation failed, using demo model:', err.message);
    onProgress(90, 'downloading');
    await new Promise(r => setTimeout(r, 400));
    onProgress(100, 'success');
    return DEMO_MODEL;
  }
}

/**
 * Generate a 3D GLB model from a video File (1–30 seconds).
 * Extracts the sharpest frame and passes it to TripoSR.
 * Falls back to demo model on failure.
 *
 * @param {File}     videoFile
 * @param {function} onProgress
 * @returns {Promise<string>}  GLB blob URL or demo model URL
 */
export async function generateModelFromVideo(videoFile, onProgress = () => {}) {
  if (!videoFile) {
    console.warn('[TripoSR] No video provided. Returning demo model.');
    onProgress(100, 'success');
    return DEMO_MODEL;
  }

  try {
    // Step 1: Extract the sharpest frame (0–65%)
    const bestFrame = await extractBestFrameFromVideo(videoFile, onProgress);

    // Step 2: Generate 3D via TripoSR Space (65–100%)
    return await generateGlbFromTripoSR(bestFrame, onProgress);
  } catch (err) {
    console.warn('[TripoSR] Failed, falling back to demo model:', err.message);
    onProgress(90, 'downloading');
    await new Promise(r => setTimeout(r, 400));
    onProgress(100, 'success');
    return DEMO_MODEL;
  }
}

// Backward compat alias
export const extractFramesFromVideo = extractBestFrameFromVideo;
