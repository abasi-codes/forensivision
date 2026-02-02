/**
 * Image Preprocessing for ONNX Model
 * Resizes, normalizes, and converts images to tensor format
 */

import { MODEL_INPUT_SIZE } from './types';

// ImageNet normalization values
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

/**
 * Load an image from a File object
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Resize image to model input size using canvas
 */
export function resizeImage(
  img: HTMLImageElement,
  targetSize: number = MODEL_INPUT_SIZE
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Use high-quality image scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Calculate scaling to maintain aspect ratio and center crop
  const scale = Math.max(targetSize / img.width, targetSize / img.height);
  const scaledWidth = img.width * scale;
  const scaledHeight = img.height * scale;
  const offsetX = (targetSize - scaledWidth) / 2;
  const offsetY = (targetSize - scaledHeight) / 2;

  ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

  return ctx.getImageData(0, 0, targetSize, targetSize);
}

/**
 * Convert ImageData to normalized NCHW tensor
 * NCHW = [batch, channels, height, width]
 */
export function imageDataToTensor(imageData: ImageData): Float32Array {
  const { data, width, height } = imageData;
  const channels = 3; // RGB

  // Create tensor in NCHW format
  const tensor = new Float32Array(1 * channels * height * width);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4; // RGBA

      // Extract RGB values and normalize to [0, 1]
      const r = data[pixelIndex] / 255;
      const g = data[pixelIndex + 1] / 255;
      const b = data[pixelIndex + 2] / 255;

      // Apply ImageNet normalization
      const rNorm = (r - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
      const gNorm = (g - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
      const bNorm = (b - IMAGENET_MEAN[2]) / IMAGENET_STD[2];

      // Place in NCHW format
      const offset = y * width + x;
      tensor[0 * height * width + offset] = rNorm; // R channel
      tensor[1 * height * width + offset] = gNorm; // G channel
      tensor[2 * height * width + offset] = bNorm; // B channel
    }
  }

  return tensor;
}

/**
 * Full preprocessing pipeline: File -> Tensor
 */
export async function preprocessImage(file: File): Promise<Float32Array> {
  const img = await loadImage(file);
  const resized = resizeImage(img, MODEL_INPUT_SIZE);
  const tensor = imageDataToTensor(resized);

  // Clean up object URL
  URL.revokeObjectURL(img.src);

  return tensor;
}
