/**
 * TripoSR Service (Open-Source Self-Hosted)
 * 
 * This service sends images to your custom Python TripoSR PyTorch backend server.
 * You must set VITE_TRIPOSR_BACKEND_URL in your .env file to the URL of your Python GPU server.
 * Example: VITE_TRIPOSR_BACKEND_URL=http://localhost:8000/generate-3d/
 */

const TRIPOSR_API = import.meta.env.VITE_TRIPOSR_BACKEND_URL || 'http://localhost:8000/generate-3d/';
const DEMO_MODEL  = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';

/**
 * Generate a 3D GLB model from an image File using a custom TripoSR backend.
 *
 * @param {File}     imageFile   Image captured from camera or uploaded from gallery
 * @param {function} onProgress  (pct: number, stage: string) => void
 * @returns {Promise<File|string>} Returns a .glb File object, or a fallback demo string URL
 */
export async function generateModelFromImage(imageFile, onProgress = () => {}) {
  // If no imageFile is provided, run a quick demo
  if (!imageFile) {
    onProgress(10, 'uploading');
    await new Promise(r => setTimeout(r, 1000));
    onProgress(50, 'running');
    await new Promise(r => setTimeout(r, 1000));
    onProgress(100, 'success');
    return DEMO_MODEL;
  }

  onProgress(10, 'uploading');
  
  const formData = new FormData();
  formData.append('image', imageFile);

  try {
    onProgress(50, 'running');
    // Send to your custom PyTorch backend
    const res = await fetch(TRIPOSR_API, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`TripoSR Backend Error: ${res.status}`);
    }

    onProgress(80, 'texturing');
    const blob = await res.blob();
    
    // Return a File object so the Vendor Dashboard can upload it to Firebase Storage
    onProgress(100, 'success');
    return new File([blob], `triposr_${Date.now()}.glb`, { type: 'model/gltf-binary' });

  } catch (err) {
    console.error("TripoSR Self-Hosted fetch failed:", err);
    throw err;
  }
}
