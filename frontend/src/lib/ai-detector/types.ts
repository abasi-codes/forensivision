/**
 * AI Detector TypeScript Interfaces
 */

export interface DetectionResult {
  verdict: 'ai_generated' | 'authentic' | 'inconclusive';
  confidence: number;
  aiProbability: number;
  authenticProbability: number;
  processingTimeMs: number;
}

export interface DetectorStatus {
  isLoaded: boolean;
  isLoading: boolean;
  loadProgress: number;
  error: string | null;
}

export interface DetectorConfig {
  modelPath: string;
  wasmPath: string;
  useWebGL: boolean;
  cacheEnabled: boolean;
  thresholds: DetectionThresholds;
}

export interface DetectionThresholds {
  ai: number;       // Above this = ai_generated
  authentic: number; // Below this = authentic
  // Between = inconclusive
}

export interface ModelCacheEntry {
  modelData: ArrayBuffer;
  timestamp: number;
  version: string;
}

export const DEFAULT_CONFIG: DetectorConfig = {
  modelPath: '/models/ai-detector-int8.onnx',
  wasmPath: '/onnx/',
  useWebGL: true,
  cacheEnabled: true,
  thresholds: {
    ai: 0.65,
    authentic: 0.35,
  },
};

export const MODEL_VERSION = '1.0.0';
export const MODEL_INPUT_SIZE = 224;
export const CACHE_DB_NAME = 'ai-detector-cache';
export const CACHE_STORE_NAME = 'models';
