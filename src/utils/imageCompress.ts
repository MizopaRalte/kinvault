export interface CompressionResult {
  dataUrl: string;
  sizeKb: number;
  width: number;
  height: number;
}

function loadImage(fileOrDataUrl: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image: ' + e));

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error('Could not read file'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

function calculateBase64SizeKb(dataUrl: string): number {
  // Approximate base64 payload size in KB
  const base64Str = dataUrl.startsWith('data:') ? dataUrl.split(',')[1] || '' : dataUrl;
  const padding = (base64Str.match(/=/g) || []).length;
  const bytes = (base64Str.length * 3) / 4 - padding;
  return Math.round((bytes / 1024) * 10) / 10;
}

/**
 * Center-crop image to square 300 x 300 px and compress to WebP (quality 0.75)
 * Typical size: 15–25 KB
 */
export async function compressAvatar(
  fileOrDataUrl: File | string,
  targetSize: number = 300,
  quality: number = 0.75
): Promise<CompressionResult> {
  const img = await loadImage(fileOrDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Compute center crop bounds
  const minDim = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - minDim) / 2;
  const sy = (img.naturalHeight - minDim) / 2;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

  let dataUrl = canvas.toDataURL('image/webp', quality);
  // Fallback to jpeg if webp is somehow unsupported
  if (!dataUrl.startsWith('data:image/webp')) {
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  const sizeKb = calculateBase64SizeKb(dataUrl);
  return {
    dataUrl,
    sizeKb,
    width: targetSize,
    height: targetSize,
  };
}

/**
 * Scale down proportionally to max width 1280 px (never upscale smaller images)
 * Compress to WebP (quality 0.75), typical size: 90–140 KB
 */
export async function compressFamilyPhoto(
  fileOrDataUrl: File | string,
  maxWidth: number = 1280,
  quality: number = 0.75
): Promise<CompressionResult> {
  const img = await loadImage(fileOrDataUrl);
  let targetWidth = img.naturalWidth;
  let targetHeight = img.naturalHeight;

  // Scale down if wider than maxWidth
  if (targetWidth > maxWidth) {
    const scale = maxWidth / targetWidth;
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  let dataUrl = canvas.toDataURL('image/webp', quality);
  if (!dataUrl.startsWith('data:image/webp')) {
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  const sizeKb = calculateBase64SizeKb(dataUrl);
  return {
    dataUrl,
    sizeKb,
    width: targetWidth,
    height: targetHeight,
  };
}
