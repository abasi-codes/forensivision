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
