import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(1)}%`;
}

export function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case 'authentic':
    case 'likely_authentic':
      return 'text-authentic';
    case 'ai_generated':
    case 'likely_ai':
    case 'manipulated':
      return 'text-ai';
    default:
      return 'text-inconclusive';
  }
}

export function getVerdictBgColor(verdict: string): string {
  switch (verdict) {
    case 'authentic':
    case 'likely_authentic':
      return 'bg-authentic-light';
    case 'ai_generated':
    case 'likely_ai':
    case 'manipulated':
      return 'bg-ai-light';
    default:
      return 'bg-inconclusive-light';
  }
}

export function formatVerdict(verdict: string): string {
  const labels: Record<string, string> = {
    authentic: 'Authentic',
    likely_authentic: 'Likely Authentic',
    inconclusive: 'Inconclusive',
    likely_ai: 'Likely AI-Generated',
    ai_generated: 'AI-Generated',
    manipulated: 'Manipulated',
  };
  return labels[verdict] || verdict;
}

// ============ Image Hashing & Deterministic Analysis ============

/**
 * Compute SHA-256 hash of a file using Web Crypto API
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert hex hash to numeric seed (first 8 chars = 32 bits)
 */
export function hashToSeed(hash: string): number {
  return parseInt(hash.slice(0, 8), 16);
}

/**
 * Mulberry32 PRNG - deterministic random from seed
 * Returns a function that generates numbers 0-1
 */
export function createSeededRandom(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
