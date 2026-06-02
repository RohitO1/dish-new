/**
 * Tripo3D Service (Official API via Vercel Proxy)
 * 
 * In production (Vercel), all API calls route through /api/tripo-proxy
 * to avoid CORS issues. Locally, calls go directly to the Tripo API.
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
  const uploadForm = new FormData();
  uploadForm.append('file', imageFile);

  const uploadRes = await tripoFetch('upload', {
    method: 'POST',
    body: uploadForm,
    // No Content-Type header — browser sets it automatically with the boundary
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => uploadRes.status);
    throw new Error(`Tripo upload failed (${uploadRes.status}): ${errText}`);
  }
  const uploadData = await uploadRes.json();

  const fileToken = uploadData.data?.image_token || uploadData.data?.file_token;
  if (!fileToken) throw new Error('Upload succeeded but no token returned from Tripo.');

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

  // 3. Poll for completion
  onProgress(35, 'running');
  let taskResult;
  let attempts = 0;
  while (attempts < 120) { // max 6 min
    await new Promise(r => setTimeout(r, 3000));
    attempts++;

    const pollRes = await tripoFetch(`task/${taskId}`);
    const pollData = await pollRes.json();
    const status = pollData.data?.status;

    if (status === 'success') {
      taskResult = pollData.data.result;
      break;
    } else if (status === 'failed' || status === 'cancelled') {
      throw new Error(`Tripo3D task ${status}.`);
    }

    const apiProgress = pollData.data?.progress || 0;
    const mapped = 35 + (apiProgress * 0.55);
    onProgress(mapped, apiProgress > 50 ? 'texturing' : 'running');
  }

  if (!taskResult) throw new Error('Tripo3D task timed out after 6 minutes.');

  // 4. Download the GLB
  onProgress(95, 'downloading');
  const modelUrl = taskResult.model?.url;
  if (!modelUrl) throw new Error('No model URL in Tripo result.');

  const blobRes = await fetch(modelUrl);
  if (!blobRes.ok) throw new Error(`Failed to download GLB from Tripo (${blobRes.status})`);
  const blob = await blobRes.blob();

  onProgress(100, 'success');
  return new File([blob], `tripo_dish_${Date.now()}.glb`, { type: 'model/gltf-binary' });
}
