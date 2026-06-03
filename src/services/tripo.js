/**
 * 3D Model Generation Service
 *
 * Uses Hugging Face Inference API (TripoSR) — 100% FREE.
 * Requires a free HF token set in VITE_HF_TOKEN (get one at huggingface.co/settings/tokens).
 *
 * On Vercel (production): routes through /api/tripo/generate proxy to avoid CORS.
 * Locally: calls Hugging Face directly.
 *
 * Fallback: if no token, returns a demo model URL.
 */

const HF_TOKEN   = import.meta.env.VITE_HF_TOKEN || '';
const DEMO_MODEL = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';

// Route through proxy in production to avoid CORS
const IS_PROD = !window.location.hostname.includes('localhost') &&
               !window.location.hostname.includes('127.0.0.1');

// ─── Image Pre-processing ─────────────────────────────────────────

/**
 * Resize and compress an image File/Blob to ≤ 512px (TripoSR optimal size).
 * Returns a new File with smaller footprint for faster API uploads.
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
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          } else {
            resolve(file); // fallback to original
          }
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback to original on error
    };
    img.src = url;
  });
}

// ─── Frame extraction from video ─────────────────────────────────

/**
 * Seek a video element to a given time, with a timeout to avoid hanging.
 */
function seekTo(video, time, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Seek timed out at ${time.toFixed(2)}s`));
    }, timeoutMs);

    const onSeeked = () => {
      clearTimeout(timer);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      resolve();
    };
    const onError = () => {
      clearTimeout(timer);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      reject(new Error('Video seek failed'));
    };

    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.currentTime = time;
  });
}

/**
 * Capture a single frame from a video element at its current time.
 * Returns a File (JPEG).
 */
function captureFrame(video, label = 'frame') {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    // Cap frame size for performance — TripoSR doesn't benefit from >1024px
    const maxDim = 768;
    let w = video.videoWidth  || 1280;
    let h = video.videoHeight || 720;
    if (w > maxDim || h > maxDim) {
      const s = maxDim / Math.max(w, h);
      w = Math.round(w * s);
      h = Math.round(h * s);
    }
    canvas.width  = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(new File([blob], `frame_${label}.jpg`, { type: 'image/jpeg' }));
        else resolve(null);
      },
      'image/jpeg',
      0.90
    );
  });
}

/**
 * Extract the single BEST frame from a video File.
 * Strategy: sample multiple candidate frames (spread across 15%–85% of duration),
 * and pick the sharpest one using a Laplacian variance heuristic.
 *
 * Supports videos from 1 second up to 30 seconds.
 *
 * @param {File}     videoFile
 * @param {function} onProgress  (pct: 0–100, stage: string) => void
 * @returns {Promise<File>}  The best JPEG frame extracted
 */
export async function extractBestFrameFromVideo(videoFile, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted       = true;
    video.playsInline = true;
    video.preload     = 'auto';
    video.crossOrigin = 'anonymous';

    const url = URL.createObjectURL(videoFile);
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.addEventListener('error', (e) => {
      cleanup();
      reject(new Error(`Failed to load video: ${e.message || 'unknown error'}`));
    });

    video.addEventListener('loadedmetadata', async () => {
      try {
        const duration = video.duration;

        if (!duration || !isFinite(duration) || duration < 0.3) {
          cleanup();
          reject(new Error('Video is too short. Please upload a video of at least 1 second.'));
          return;
        }

        if (duration > 30) {
          cleanup();
          reject(new Error('Video is too long. Please upload a video under 30 seconds.'));
          return;
        }

        // Determine candidate timestamps spread across the "dish display" window
        const start  = Math.min(duration * 0.15, 1.0);
        const end    = Math.max(duration * 0.85, duration - 0.5);
        const numCandidates = duration <= 3 ? 3 : duration <= 10 ? 5 : 8;

        const timestamps = [start];
        if (numCandidates > 1) {
          const step = (end - start) / (numCandidates - 1);
          for (let i = 1; i < numCandidates; i++) {
            timestamps.push(start + step * i);
          }
        }

        onProgress(5, 'extracting');

        const candidates = [];
        for (let i = 0; i < timestamps.length; i++) {
          try {
            await seekTo(video, timestamps[i]);
            const frame = await captureFrame(video, `candidate_${i}`);
            if (frame) candidates.push(frame);
          } catch {
            // Skip frames that time out or fail
          }

          const pct = 5 + Math.round(((i + 1) / timestamps.length) * 55);
          onProgress(pct, 'extracting');
        }

        cleanup();

        if (!candidates.length) {
          reject(new Error('Could not extract any frames from the video.'));
          return;
        }

        // Pick the sharpest frame using Laplacian variance
        const best = await pickSharpestFrame(candidates, onProgress);
        onProgress(65, 'selected');
        resolve(best);
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  });
}

/**
 * Compute a sharpness score for an image file using Laplacian variance on a
 * small downscaled canvas (fast approximation).
 */
async function sharpnessScore(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      // Downscale to 64×64 for speed
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);

      // Convert to grayscale
      const gray = [];
      for (let i = 0; i < data.length; i += 4) {
        gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      }

      // Laplacian filter variance
      let sum = 0, sumSq = 0;
      let count = 0;
      for (let r = 1; r < size - 1; r++) {
        for (let c = 1; c < size - 1; c++) {
          const idx = r * size + c;
          const lap = Math.abs(
            -gray[idx - size - 1] - gray[idx - size] - gray[idx - size + 1]
            - gray[idx - 1] + 8 * gray[idx] - gray[idx + 1]
            - gray[idx + size - 1] - gray[idx + size] - gray[idx + size + 1]
          );
          sum   += lap;
          sumSq += lap * lap;
          count++;
        }
      }
      const mean = sum / count;
      const variance = sumSq / count - mean * mean;
      resolve(variance);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    img.src = url;
  });
}

async function pickSharpestFrame(frames, onProgress) {
  const scores = await Promise.all(frames.map(f => sharpnessScore(f)));
  let bestIdx = 0;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > scores[bestIdx]) bestIdx = i;
  }
  return frames[bestIdx];
}

// ─── Core HF TripoSR generation ──────────────────────────────────

/**
 * Convert an image File to base64 data URL.
 */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Call the Hugging Face Inference API with TripoSR to generate a 3D GLB.
 * Returns a File of the GLB.
 */
async function generateGlbFromHuggingFace(imageFile, onProgress) {
  onProgress(68, 'compressing');

  // Compress image before upload for faster transfer
  const compressed = await compressImage(imageFile, 512, 0.88);

  onProgress(75, 'queued');

  // Use proxy in prod, direct in dev
  const endpoint = IS_PROD
    ? '/api/tripo/generate'
    : 'https://api-inference.huggingface.co/models/stabilityai/TripoSR';

  // TripoSR (like most HF image models) accepts raw binary image data
  const headers = { 'Content-Type': 'image/jpeg' };
  if (!IS_PROD && HF_TOKEN) {
    headers['Authorization'] = `Bearer ${HF_TOKEN}`;
  }

  onProgress(82, 'running');

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: compressed, // Send the binary File object directly
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => String(res.status));
    throw new Error(`3D Generation failed (${res.status}): ${errText}`);
  }

  onProgress(95, 'downloading');

  const blob = await res.blob();
  if (!blob || blob.size < 1000) {
    throw new Error('Received empty or invalid model data from the API.');
  }

  onProgress(100, 'success');
  return new File([blob], `dish_3d_${Date.now()}.glb`, { type: 'model/gltf-binary' });
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Generate a 3D GLB model from a single image File.
 * Pre-processes (resize/compress) before sending to TripoSR.
 *
 * @param {File}     imageFile
 * @param {function} onProgress  (pct: number, stage: string) => void
 * @returns {Promise<File|string>}  .glb File, or demo URL on fallback
 */
export async function generateModelFromImage(imageFile, onProgress = () => {}) {
  if (!imageFile) {
    console.warn('No image provided. Returning demo model.');
    onProgress(100, 'success');
    return DEMO_MODEL;
  }

  // If no token locally AND not in prod — return demo
  if (!HF_TOKEN && !IS_PROD) {
    console.warn('No VITE_HF_TOKEN set. Using demo model. Get a free token at huggingface.co/settings/tokens');
    onProgress(10, 'uploading');
    await new Promise(r => setTimeout(r, 600));
    onProgress(50, 'running');
    await new Promise(r => setTimeout(r, 800));
    onProgress(100, 'success');
    return DEMO_MODEL;
  }

  // Compress before passing to generator (handles both image and camera captures)
  onProgress(5, 'compressing');
  const compressed = await compressImage(imageFile, 512, 0.88);
  onProgress(10, 'compressed');

  return generateGlbFromHuggingFace(compressed, onProgress);
}

/**
 * Generate a 3D GLB model from a video File (1–30 seconds).
 * Extracts the sharpest frame automatically and passes it to TripoSR.
 *
 * @param {File}     videoFile
 * @param {function} onProgress
 * @returns {Promise<File|string>}
 */
export async function generateModelFromVideo(videoFile, onProgress = () => {}) {
  if (!videoFile) {
    console.warn('No video provided. Returning demo model.');
    onProgress(100, 'success');
    return DEMO_MODEL;
  }

  if (!HF_TOKEN && !IS_PROD) {
    console.warn('No VITE_HF_TOKEN set. Using demo model.');
    onProgress(5, 'extracting');
    await new Promise(r => setTimeout(r, 600));
    onProgress(50, 'running');
    await new Promise(r => setTimeout(r, 800));
    onProgress(100, 'success');
    return DEMO_MODEL;
  }

  // Step 1: Extract the best frame from the video (0–65% progress)
  const bestFrame = await extractBestFrameFromVideo(videoFile, onProgress);

  // Step 2: Generate 3D from the best frame (65–100% progress)
  return generateGlbFromHuggingFace(bestFrame, onProgress);
}

// Keep backward compat export alias
export const extractFramesFromVideo = extractBestFrameFromVideo;
