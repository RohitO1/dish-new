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

// ─── Frame extraction from video (pure browser, zero dependencies) ─

/**
 * Extract N evenly-spaced frames from a video File using <video> + <canvas>.
 */
export async function extractFramesFromVideo(videoFile, count = 4, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const url = URL.createObjectURL(videoFile);
    video.src = url;

    video.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video file. Ensure it is a valid video format.'));
    });

    video.addEventListener('loadedmetadata', () => {
      const duration = video.duration;
      if (!duration || duration < 0.5) {
        URL.revokeObjectURL(url);
        reject(new Error('Video is too short. Please upload a video of at least 1 second.'));
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const startPct = 0.15;
      const endPct   = 0.85;
      const step     = (endPct - startPct) / (count - 1);
      const timestamps = Array.from({ length: count }, (_, i) =>
        duration * (startPct + step * i)
      );

      const frames = [];
      let idx = 0;

      const captureNext = () => {
        if (idx >= timestamps.length) {
          URL.revokeObjectURL(url);
          resolve(frames);
          return;
        }
        video.currentTime = timestamps[idx];
      };

      video.addEventListener('seeked', () => {
        canvas.width  = video.videoWidth  || 1280;
        canvas.height = video.videoHeight || 720;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(blob => {
          if (blob) {
            const viewLabels = ['front', 'left', 'back', 'right'];
            const label = viewLabels[idx] || `view_${idx}`;
            frames.push(new File([blob], `frame_${label}.jpg`, { type: 'image/jpeg' }));
          }
          const pct = Math.round(((idx + 1) / timestamps.length) * 100);
          onProgress(pct, 'extracting');
          idx++;
          captureNext();
        }, 'image/jpeg', 0.92);
      });

      captureNext();
    });
  });
}

// ─── Core HF TripoSR generation ──────────────────────────────────

/**
 * Convert an image File to base64 data URL.
 */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Call the Hugging Face Inference API with TripoSR to generate a 3D GLB.
 * Returns a Blob of the GLB file.
 */
async function generateGlbFromHuggingFace(imageFile, onProgress) {
  onProgress(10, 'uploading');

  const imageBase64 = await fileToBase64(imageFile);

  onProgress(25, 'queued');

  // Use proxy in prod, direct in dev
  const endpoint = IS_PROD
    ? '/api/tripo/generate'
    : 'https://api-inference.huggingface.co/models/stabilityai/TripoSR';

  const headers = { 'Content-Type': 'application/json' };
  if (!IS_PROD && HF_TOKEN) {
    headers['Authorization'] = `Bearer ${HF_TOKEN}`;
  }

  onProgress(35, 'running');

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ inputs: imageBase64 }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.status);
    throw new Error(`3D Generation failed (${res.status}): ${errText}`);
  }

  onProgress(80, 'downloading');

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
 * Uses HuggingFace TripoSR (FREE).
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

  return generateGlbFromHuggingFace(imageFile, onProgress);
}

/**
 * Generate a 3D GLB model from a video File.
 * Extracts the best frame and passes it to TripoSR.
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

  // Extract the single best frame (middle of the video) for TripoSR
  onProgress(5, 'extracting');
  const frames = await extractFramesFromVideo(videoFile, 1, (pct) => {
    onProgress(5 + pct * 0.10, 'extracting');
  });

  if (!frames.length) {
    throw new Error('Could not extract a frame from the video.');
  }

  return generateGlbFromHuggingFace(frames[0], onProgress);
}
