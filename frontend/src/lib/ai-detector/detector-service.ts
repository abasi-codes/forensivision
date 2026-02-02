/**
 * AI Detector Service - ONNX Inference Singleton
 * Manages model loading, caching, and inference
 * Loads ONNX Runtime from a script tag to avoid bundler issues
 */

import { getCachedModel, cacheModel } from './model-cache';
import { preprocessImage } from './preprocessing';
import {
  DetectionResult,
  DetectorStatus,
  DetectorConfig,
  DEFAULT_CONFIG,
  MODEL_INPUT_SIZE,
} from './types';

// Declare global ort type
declare global {
  interface Window {
    ort: typeof import('onnxruntime-web');
  }
}

type ProgressCallback = (progress: number) => void;

/**
 * Load ONNX Runtime script dynamically
 */
function loadOrtScript(): Promise<typeof import('onnxruntime-web')> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (typeof window !== 'undefined' && window.ort) {
      resolve(window.ort);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[data-ort-loader]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.ort));
      existingScript.addEventListener('error', () => reject(new Error('Failed to load ONNX Runtime')));
      return;
    }

    const script = document.createElement('script');
    script.src = '/onnx/ort.min.js';
    script.async = true;
    script.setAttribute('data-ort-loader', 'true');

    script.onload = () => {
      if (window.ort) {
        resolve(window.ort);
      } else {
        reject(new Error('ONNX Runtime loaded but not available on window'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load ONNX Runtime script'));
    };

    document.head.appendChild(script);
  });
}

class AIDetectorService {
  private ort: typeof import('onnxruntime-web') | null = null;
  private session: import('onnxruntime-web').InferenceSession | null = null;
  private config: DetectorConfig;
  private loadPromise: Promise<void> | null = null;
  private progressCallback: ProgressCallback | null = null;

  constructor(config: Partial<DetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current detector status
   */
  getStatus(): Omit<DetectorStatus, 'loadProgress'> {
    return {
      isLoaded: this.session !== null,
      isLoading: this.loadPromise !== null && this.session === null,
      error: null,
    };
  }

  /**
   * Set progress callback for model loading
   */
  setProgressCallback(callback: ProgressCallback | null): void {
    this.progressCallback = callback;
  }

  /**
   * Load the ONNX model
   */
  async loadModel(): Promise<void> {
    // Return existing load promise if already loading
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Already loaded
    if (this.session) {
      return;
    }

    this.loadPromise = this._loadModelInternal();

    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  private async _loadModelInternal(): Promise<void> {
    try {
      // Load ONNX Runtime via script tag
      if (!this.ort) {
        this.ort = await loadOrtScript();
      }

      // Configure ONNX Runtime
      this.ort.env.wasm.wasmPaths = this.config.wasmPath;

      // Try WebGL first, fall back to WASM
      const executionProviders: string[] = this.config.useWebGL
        ? ['webgl', 'wasm']
        : ['wasm'];

      let modelData: ArrayBuffer;

      // Try to load from cache first
      if (this.config.cacheEnabled) {
        const cached = await getCachedModel();
        if (cached) {
          console.log('Loading model from IndexedDB cache');
          modelData = cached;
          this.progressCallback?.(100);
        } else {
          modelData = await this.fetchModelWithProgress();
          // Cache for future use
          await cacheModel(modelData);
        }
      } else {
        modelData = await this.fetchModelWithProgress();
      }

      // Create inference session
      this.session = await this.ort.InferenceSession.create(modelData, {
        executionProviders,
        graphOptimizationLevel: 'all',
      });

      console.log('AI Detector model loaded successfully');
    } catch (error) {
      console.error('Failed to load AI detector model:', error);
      throw error;
    }
  }

  private async fetchModelWithProgress(): Promise<ArrayBuffer> {
    const response = await fetch(this.config.modelPath);

    if (!response.ok) {
      throw new Error(`Failed to fetch model: ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      // Fallback if streaming not supported
      this.progressCallback?.(50);
      const buffer = await response.arrayBuffer();
      this.progressCallback?.(100);
      return buffer;
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      received += value.length;

      if (total > 0) {
        const progress = Math.round((received / total) * 100);
        this.progressCallback?.(progress);
      }
    }

    // Combine chunks into single ArrayBuffer
    const combined = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    return combined.buffer;
  }

  /**
   * Run inference on an image file
   */
  async detect(file: File): Promise<DetectionResult> {
    if (!this.session || !this.ort) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    const startTime = performance.now();

    // Preprocess image
    const tensor = await preprocessImage(file);

    // Create ONNX tensor
    const inputTensor = new this.ort.Tensor('float32', tensor, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]);

    // Get input name from model
    const inputName = this.session.inputNames[0];

    // Run inference
    const feeds: Record<string, import('onnxruntime-web').Tensor> = { [inputName]: inputTensor };
    const results = await this.session.run(feeds);

    // Get output (model outputs logits or probabilities)
    const outputName = this.session.outputNames[0];
    const output = results[outputName];
    const outputData = output.data as Float32Array;

    // Apply softmax if needed (model outputs logits)
    const probabilities = this.softmax(outputData);

    // Model outputs: [authentic_prob, ai_prob] or [ai_prob, authentic_prob]
    // umm-maybe/AI-image-detector: label 0 = "artificial", label 1 = "human"
    const aiProbability = probabilities[0];
    const authenticProbability = probabilities[1];

    const processingTimeMs = performance.now() - startTime;

    // Determine verdict based on thresholds
    let verdict: DetectionResult['verdict'];
    if (aiProbability >= this.config.thresholds.ai) {
      verdict = 'ai_generated';
    } else if (aiProbability <= this.config.thresholds.authentic) {
      verdict = 'authentic';
    } else {
      verdict = 'inconclusive';
    }

    // Confidence is distance from decision boundary
    const confidence = Math.max(aiProbability, authenticProbability);

    return {
      verdict,
      confidence,
      aiProbability,
      authenticProbability,
      processingTimeMs,
    };
  }

  private softmax(logits: Float32Array): number[] {
    const logitsArray = Array.from(logits);
    const maxLogit = Math.max(...logitsArray);
    const expScores = logitsArray.map(l => Math.exp(l - maxLogit));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    return expScores.map(e => e / sumExp);
  }

  /**
   * Unload the model and free resources
   */
  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
  }
}

// Singleton instance
let detectorInstance: AIDetectorService | null = null;

export function getDetectorService(config?: Partial<DetectorConfig>): AIDetectorService {
  if (!detectorInstance) {
    detectorInstance = new AIDetectorService(config);
  }
  return detectorInstance;
}

export function resetDetectorService(): void {
  if (detectorInstance) {
    detectorInstance.dispose();
    detectorInstance = null;
  }
}

export { AIDetectorService };
