/**
 * Tripo3D Service (Official API via Vercel Proxy)
 * 
 * In production (Vercel), all API calls route through /api/tripo-proxy
 * to avoid CORS issues. Locally, calls go directly to the Tripo API.
 *
 * Supports two generation modes:
 *   1. Image-to-Model  — single photo → 3D GLB
 *   2. Video-to-Model  — short video → 4 keyframes → multiview_to_model → 3D GLB
 */

const TRIPO_API_KEY = import.meta.env.VITE_TRIPO_API_KEY || '';
const DEMO_MODEL    = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';

// Use our proxy on Vercel (non-localhost), direct otherwise
const IS_PROD = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');
const PROXY_BASE = '/api/tripo-proxy';

async function tripoFetch(path, options = {}) {
  if (IS_PROD) {
    // Route through our Vercel edge proxy
    const proxyUrl = `${PROXY_BASE}?path=${encodeURIComponent(path)}`;
    return fetch(proxyUrl, options);
  }
  // Direct call locally (API key is in .env)
  return fetch(`https://api.tripo3d.ai/v2/openapi/${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${TRIPO_API_KEY}`,
      ...(options.headers || {}),
    }
  });
}

// ─── Shared helpers ───────────────────────────────────────────────

/**
 * Upload a single image File to Tripo and return its file_token.
 */
async function uploadFileToTripo(file) {
  const form = new FormData();
  form.append('file', file);

  const res = await tripoFetch('upload', { method: 'POST', body: form });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.status);
    throw new Error(`Tripo upload failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const token = data.data?.image_token || data.data?.file_token;
  if (!token) throw new Error('Upload succeeded but no token returned from Tripo.');
  return token;
}

/**
 * Poll a Tripo task until completion and download the resulting GLB.
 * @param {string}   taskId
 * @param {function} onProgress  (pct, stage) — pct range is [progressStart..95]
 * @param {number}   progressStart  Where in the overall % range polling starts
 * @returns {Promise<File>}  The downloaded GLB as a File object
 */
async function pollTaskToGlb(taskId, onProgress, progressStart = 35) {
  let taskResult;
  let attempts = 0;
  while (attempts < 120) { // max ~6 min
    await new Promise(r => setTimeout(r, 3000));
    attempts++;

    const pollRes = await tripoFetch(`task/${taskId}`);
    const pollData = await pollRes.json();
    const status = pollData.data?.status;

    if (status === 'success') {
      taskResult = pollData.data.result || pollData.data.output;
      break;
    } else if (status === 'failed' || status === 'cancelled') {
      throw new Error(`Tripo3D task ${status}.`);
    }

    const apiProgress = pollData.data?.progress || 0;
    const mapped = progressStart + (apiProgress * ((95 - progressStart) / 100));
    onProgress(mapped, apiProgress > 50 ? 'texturing' : 'running');
  }

  if (!taskResult) throw new Error('Tripo3D task timed out after 6 minutes.');

  // Download the GLB
  onProgress(95, 'downloading');
  const modelUrl = taskResult.model?.url || taskResult.pbr_model?.url;
  if (!modelUrl) throw new Error('No model URL in Tripo result.');

  const blobRes = await fetch(modelUrl);
  if (!blobRes.ok) throw new Error(`Failed to download GLB from Tripo (${blobRes.status})`);
  const blob = await blobRes.blob();

  onProgress(100, 'success');
  return new File([blob], `tripo_dish_${Date.now()}.glb`, { type: 'model/gltf-binary' });
}

// ─── Frame extraction from video (pure browser, zero dependencies) ─

/**
 * Extract N evenly-spaced frames from a video File using <video> + <canvas>.
 * @param {File}   videoFile
 * @param {number} count  Number of frames to extract (default 4)
 * @param {function} onProgress  (pct, stage) — pct range during extraction is [0..extractEndPct]
 * @returns {Promise<File[]>}  Array of JPEG File objects
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

      // Evenly-spaced timestamps (avoid first/last 10% — often blurry)
      const startPct = 0.10;
      const endPct   = 0.90;
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


// ─── Public API ───────────────────────────────────────────────────

/**
 * Generate a 3D GLB model from an image File using Tripo3D API.
 * @param {File}     imageFile   Image captured from camera or uploaded from gallery
 * @param {function} onProgress  (pct: number, stage: string) => void
 * @returns {Promise<File|string>} Returns a .glb File object, or a fallback demo string URL
 */
export async function generateModelFromImage(imageFile, onProgress = () => {}) {
  if (!imageFile || (!TRIPO_API_KEY && !IS_PROD)) {
    console.warn('No Tripo API key or image provided. Falling back to demo mode.');
    onProgress(10, 'uploading');
    await new Promise(r => setTimeout(r, 800));
    onProgress(50, 'running');
    await new Promise(r => setTimeout(r, 800));
    onProgress(100, 'success');
    return DEMO_MODEL;
  }

  // 1. Upload the image
  onProgress(10, 'uploading');
  const fileToken = await uploadFileToTripo(imageFile);

  // 2. Submit image-to-model task
  onProgress(25, 'queued');
  const taskRes = await tripoFetch('task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'image_to_model',
      file: {
        type: imageFile.name.split('.').pop() || 'jpg',
        file_token: fileToken
      }
    })
  });

  if (!taskRes.ok) {
    const errText = await taskRes.text().catch(() => taskRes.status);
    throw new Error(`Tripo task creation failed (${taskRes.status}): ${errText}`);
  }
  const taskData = await taskRes.json();
  const taskId = taskData.data?.task_id;
  if (!taskId) throw new Error('No task_id returned from Tripo.');

  // 3. Poll + download
  onProgress(35, 'running');
  return pollTaskToGlb(taskId, onProgress, 35);
}

/**
 * Generate a 3D GLB model from a video File.
 * Pipeline: extract 4 keyframes → upload each → multiview_to_model → poll → GLB
 *
 * @param {File}     videoFile   Video of the dish (any format the browser can play)
 * @param {function} onProgress  (pct: number, stage: string) => void
 * @returns {Promise<File|string>} Returns a .glb File object, or a fallback demo URL
 */
export async function generateModelFromVideo(videoFile, onProgress = () => {}) {
  if (!videoFile || (!TRIPO_API_KEY && !IS_PROD)) {
    console.warn('No Tripo API key or video provided. Falling back to demo mode.');
    onProgress(5, 'extracting');
    await new Promise(r => setTimeout(r, 600));
    onProgress(20, 'uploading');
    await new Promise(r => setTimeout(r, 600));
    onProgress(50, 'running');
    await new Promise(r => setTimeout(r, 800));
    onProgress(100, 'success');
    return DEMO_MODEL;
  }

  // 1. Extract 4 keyframes from the video
  onProgress(2, 'extracting');
  const frames = await extractFramesFromVideo(videoFile, 4, (pct) => {
    // Map extraction 0-100% → overall 2-12%
    onProgress(2 + (pct * 0.10), 'extracting');
  });

  if (frames.length < 2) {
    throw new Error('Could not extract enough frames from the video. Try a longer video.');
  }

  // 2. Upload all frames to Tripo in parallel
  onProgress(14, 'uploading');
  const tokens = [];
  for (let i = 0; i < frames.length; i++) {
    const token = await uploadFileToTripo(frames[i]);
    tokens.push({ type: 'jpg', file_token: token });
    onProgress(14 + ((i + 1) / frames.length) * 10, 'uploading');
  }

  // 3. Submit multiview_to_model task
  onProgress(26, 'queued');
  const taskRes = await tripoFetch('task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'multiview_to_model',
      files: tokens
    })
  });

  if (!taskRes.ok) {
    const errText = await taskRes.text().catch(() => taskRes.status);
    throw new Error(`Tripo multiview task creation failed (${taskRes.status}): ${errText}`);
  }
  const taskData = await taskRes.json();
  const taskId = taskData.data?.task_id;
  if (!taskId) throw new Error('No task_id returned from Tripo.');

  // 4. Poll + download
  onProgress(30, 'running');
  return pollTaskToGlb(taskId, onProgress, 30);
}
