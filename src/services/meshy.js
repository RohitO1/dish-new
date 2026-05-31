/**
 * Meshy.ai Service — Free tier: 200 credits/month (~20 image-to-3D models)
 *
 * To activate real 3D generation:
 *  1. Sign up at https://app.meshy.ai
 *  2. Go to API Keys → create a key
 *  3. Add to your .env file:  VITE_MESHY_API_KEY=your_key_here
 *
 * Without a key, the service runs in DEMO mode and returns a high-quality
 * placeholder GLB after simulating the processing steps.
 */

const MESHY_API   = 'https://api.meshy.ai/v2/image-to-3d';
const MESHY_KEY   = import.meta.env.VITE_MESHY_API_KEY;
const DEMO_MODEL  = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF-Binary/Avocado.glb';
const POLL_MS     = 5000;
const TIMEOUT_MS  = 300000; // 5 min

/**
 * Convert a File object to a base64 data-URI string required by Meshy API.
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Poll a Meshy task until it reaches terminal state (SUCCEEDED / FAILED).
 * @param {string} taskId
 * @param {function} onProgress  called with (pct: number, stage: string)
 * @returns {Promise<string>}    resolved glb URL
 */
async function pollTask(taskId, onProgress) {
  const deadline = Date.now() + TIMEOUT_MS;
  const stageMap = { PENDING: 10, PROCESSING: 40, IN_PROGRESS: 70, SUCCEEDED: 100 };

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_MS));

    const res  = await fetch(`${MESHY_API}/${taskId}`, {
      headers: { Authorization: `Bearer ${MESHY_KEY}` },
    });
    const data = await res.json();

    onProgress(stageMap[data.status] ?? 50, data.status);

    if (data.status === 'SUCCEEDED') {
      return data.model_urls?.glb || data.model_url || DEMO_MODEL;
    }
    if (data.status === 'FAILED') {
      throw new Error(data.task_error?.message || 'Meshy processing failed');
    }
  }
  throw new Error('Timeout waiting for 3D model generation');
}

/**
 * Generate a 3D GLB model from a single image File.
 *
 * @param {File}     imageFile   Image from camera or gallery
 * @param {function} onProgress  (pct: number, stage: string) => void
 * @returns {Promise<string>}    URL of the generated .glb file
 */
export async function generateModelFromImage(imageFile, onProgress = () => {}) {
  // — DEMO MODE: no API key configured —
  if (!MESHY_KEY) {
    console.warn('[Meshy] No API key found (VITE_MESHY_API_KEY). Running demo simulation.');
    const stages = [
      [10,  'UPLOADING'],
      [30,  'EXTRACTING_POINTS'],
      [60,  'GENERATING_MESH'],
      [90,  'TEXTURING'],
      [100, 'SUCCEEDED'],
    ];
    for (const [pct, stage] of stages) {
      await new Promise(r => setTimeout(r, 1600));
      onProgress(pct, stage);
    }
    return DEMO_MODEL;
  }

  // — LIVE MODE: real Meshy.ai API call —
  onProgress(5, 'UPLOADING');

  const base64 = await fileToBase64(imageFile);

  const createRes = await fetch(MESHY_API, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${MESHY_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url:      base64,
      enable_pbr:     true,   // photorealistic materials
      should_remesh:  true,   // clean topology
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.message || `Meshy API error ${createRes.status}`);
  }

  const { result: taskId } = await createRes.json();
  onProgress(15, 'PROCESSING');

  return pollTask(taskId, onProgress);
}
