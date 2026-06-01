/**
 * Tripo3D Service (Official API)
 * 
 * This service interacts with the official Tripo3D API for high-fidelity 3D model generation.
 * You must set VITE_TRIPO_API_KEY in your .env file.
 */

const TRIPO_API_KEY = import.meta.env.VITE_TRIPO_API_KEY || '';
const DEMO_MODEL  = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';

/**
 * Generate a 3D GLB model from an image File using Tripo3D API.
 *
 * @param {File}     imageFile   Image captured from camera or uploaded from gallery
 * @param {function} onProgress  (pct: number, stage: string) => void
 * @returns {Promise<File|string>} Returns a .glb File object, or a fallback demo string URL
 */
export async function generateModelFromImage(imageFile, onProgress = () => {}) {
  if (!imageFile || !TRIPO_API_KEY) {
    console.warn("No Tripo API key or image provided. Falling back to demo mode.");
    onProgress(10, 'uploading');
    await new Promise(r => setTimeout(r, 1000));
    onProgress(50, 'running');
    await new Promise(r => setTimeout(r, 1000));
    onProgress(100, 'success');
    return DEMO_MODEL;
  }

  try {
    // 1. Upload the image to Tripo API
    onProgress(10, 'uploading');
    const uploadForm = new FormData();
    uploadForm.append('file', imageFile);

    const uploadRes = await fetch('https://api.tripo3d.ai/v2/openapi/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TRIPO_API_KEY}` },
      body: uploadForm
    });
    
    if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
    const uploadData = await uploadRes.json();
    
    // Tripo returns image_token (or file_token)
    const fileToken = uploadData.data?.image_token || uploadData.data?.file_token;
    if (!fileToken) throw new Error("Upload succeeded but no token returned.");

    // 2. Submit the image-to-model task
    onProgress(25, 'queued');
    const taskRes = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${TRIPO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'image_to_model',
        file: { 
          type: imageFile.name.split('.').pop() || 'png', 
          file_token: fileToken 
        }
      })
    });
    
    if (!taskRes.ok) throw new Error(`Task creation failed: ${taskRes.status}`);
    const taskData = await taskRes.json();
    const taskId = taskData.data.task_id;

    // 3. Poll for status
    onProgress(35, 'running');
    let taskResult;
    while (true) {
      await new Promise(r => setTimeout(r, 3000)); // Poll every 3 seconds
      
      const pollRes = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
        headers: { 'Authorization': `Bearer ${TRIPO_API_KEY}` }
      });
      const pollData = await pollRes.json();
      const status = pollData.data.status;
      
      if (status === 'success') {
        taskResult = pollData.data.result;
        break;
      } else if (status === 'failed' || status === 'cancelled') {
        throw new Error(`Tripo3D Task stopped with status: ${status}`);
      }
      
      // Update progress gracefully (Tripo's internal progress mapped to our UI)
      const apiProgress = pollData.data.progress || 0;
      const mappedProgress = 35 + (apiProgress * 0.55); // 35 to 90
      onProgress(mappedProgress, apiProgress > 50 ? 'texturing' : 'running');
    }

    // 4. Download the generated model so we can save it to Supabase
    onProgress(95, 'downloading');
    const modelUrl = taskResult.model.url;
    
    const blobRes = await fetch(modelUrl);
    if (!blobRes.ok) throw new Error("Failed to download generated model");
    const blob = await blobRes.blob();

    onProgress(100, 'success');
    return new File([blob], `tripo_dish_${Date.now()}.glb`, { type: 'model/gltf-binary' });

  } catch (err) {
    console.error("Tripo API Error:", err);
    throw err;
  }
}
