// Cloudinary Media Upload and Optimization Module

const isCloudinaryConfigured =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME &&
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME !== 'YOUR_CLOUDINARY_CLOUD_NAME' &&
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET &&
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET !== 'YOUR_UPLOAD_PRESET';

/**
 * Uploads a file (image or video) directly to Cloudinary.
 * If credentials are not configured, it falls back to converting the file to a Local Data URL (Base64)
 * to ensure offline testing functionality works seamlessly.
 * 
 * @param {File} file The file object to upload
 * @param {string} resourceType 'image' or 'video'
 * @param {function} onProgressCallback Callback to receive upload progress percent
 * @returns {Promise<string>} The secure URL of the uploaded asset
 */
export async function uploadMedia(file, resourceType = 'image', onProgressCallback = null) {
  if (!isCloudinaryConfigured) {
    console.warn('Cloudinary not configured. Simulating upload with Local Data URL.');
    // Simulated upload progress animation
    if (onProgressCallback) {
      let progress = 0;
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          progress += 25;
          onProgressCallback(progress);
          if (progress >= 100) {
            clearInterval(interval);
            resolve();
          }
        }, 150);
      });
    }

    // Convert file to local Base64 URL for rendering
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file locally'));
      reader.readAsDataURL(file);
    });
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);

    // Track upload progress
    if (onProgressCallback && xhr.upload) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgressCallback(percentComplete);
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.secure_url) {
            resolve(response.secure_url);
          } else {
            reject(new Error('No secure_url found in Cloudinary response'));
          }
        } catch (err) {
          reject(new Error('Failed to parse Cloudinary response'));
        }
      } else {
        reject(new Error(`Cloudinary upload failed: Status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during Cloudinary upload'));
    };

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    
    xhr.send(formData);
  });
}

/**
 * Optimizes a Cloudinary image URL dynamically.
 * Adds auto-format, auto-quality, and optional width transformation.
 * Passes through non-Cloudinary links (like local mock Base64 links).
 * 
 * @param {string} url Image URL
 * @param {number} width Desired width in pixels
 * @returns {string} Optimized URL
 */
export function getOptimizedImageUrl(url, width = 800) {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('res.cloudinary.com')) return url; // Pass through fallback data-urls/emojis

  // Cloudinary URL format: .../upload/v123456/path/name.jpg
  // Insert format, quality, and width resizing transformations after /upload/
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
}

/**
 * Optimizes a Cloudinary video URL dynamically.
 * Adds auto-format, auto-quality compression.
 * Passes through non-Cloudinary links (like local mock Base64 links).
 * 
 * @param {string} url Video URL
 * @returns {string} Optimized URL
 */
export function getOptimizedVideoUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('res.cloudinary.com')) return url;

  // Insert auto-format and auto-quality transformations for video
  return url.replace('/upload/', '/upload/f_auto,q_auto/');
}
