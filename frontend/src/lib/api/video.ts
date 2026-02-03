/**
 * Video analysis API client
 */

export interface VideoAnalysisRequest {
  youtube_url: string;
  options?: {
    include_heatmap?: boolean;
    detail_level?: 'basic' | 'standard' | 'comprehensive';
  };
}

export interface FrameResult {
  timestamp: number;
  ai_probability: number;
}

export interface SuspiciousSegment {
  start: number;
  end: number;
  avg_ai_probability: number;
}

export interface VideoAnalysisData {
  youtube_id: string;
  youtube_title: string;
  frames_analyzed: number;
  frame_results: FrameResult[];
  suspicious_segments: SuspiciousSegment[];
}

export interface VideoAnalysisResponse {
  data: {
    id: string;
    type: 'video_analysis';
    attributes: {
      status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
      progress: number;
      current_stage?: string;
      created_at: string;
      completed_at?: string;
      processing_time_ms?: number;
      results?: {
        verdict: string;
        confidence: number;
        risk_level: string;
        summary: string;
        video_analysis?: VideoAnalysisData;
      };
      error?: {
        code: string;
        message: string;
      };
    };
    links: {
      self: string;
      cancel?: string;
      progress?: string;
    };
  };
}

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+/;

export function isValidYouTubeUrl(url: string): boolean {
  return YOUTUBE_REGEX.test(url);
}

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export async function submitVideoAnalysis(
  request: VideoAnalysisRequest
): Promise<VideoAnalysisResponse> {
  const response = await fetch('/api/v1/analyze/video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: {
        type: 'youtube',
        url: request.youtube_url,
      },
      options: request.options,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail?.message || 'Failed to submit video analysis');
  }

  return response.json();
}

export async function getAnalysisStatus(analysisId: string): Promise<VideoAnalysisResponse> {
  const response = await fetch(`/api/v1/analysis/${analysisId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail?.message || 'Failed to get analysis status');
  }

  return response.json();
}

export async function cancelAnalysis(analysisId: string): Promise<void> {
  const response = await fetch(`/api/v1/analysis/${analysisId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail?.message || 'Failed to cancel analysis');
  }
}

export type VideoAnalysisStage =
  | 'queued'
  | 'downloading'
  | 'extracting_frames'
  | 'analyzing'
  | 'aggregating'
  | 'completed'
  | 'failed';

export function getStageLabel(stage: string | undefined): string {
  const labels: Record<string, string> = {
    queued: 'Queued',
    downloading: 'Downloading video',
    extracting_frames: 'Extracting frames',
    analyzing: 'Analyzing frames',
    aggregating: 'Aggregating results',
    completed: 'Complete',
    failed: 'Failed',
  };
  return labels[stage || ''] || stage || 'Processing';
}

export function getStageProgress(stage: string | undefined, progress: number): number {
  // Map stages to progress ranges
  const stageRanges: Record<string, [number, number]> = {
    queued: [0, 5],
    downloading: [5, 20],
    extracting_frames: [20, 30],
    extracting: [20, 30],
    analyzing: [30, 90],
    aggregating: [90, 95],
    complete: [95, 100],
    completed: [100, 100],
  };

  const range = stageRanges[stage || ''];
  if (!range) return progress;

  // Interpolate within the stage's range
  const [min, max] = range;
  return Math.min(max, Math.max(min, progress));
}

// ============================================================================
// Demo Video Analysis API (No Auth Required)
// ============================================================================

export type DemoVideoStage =
  | 'idle'
  | 'submitting'
  | 'downloading'
  | 'extracting'
  | 'analyzing'
  | 'complete'
  | 'error';

export interface DemoVideoProgress {
  stage: DemoVideoStage;
  progress: number;
  framesAnalyzed?: number;
  totalFrames?: number;
}

export interface DemoVideoAnalysisResponse {
  data: {
    id: string;
    type: 'demo_video_analysis';
    attributes: {
      status: 'pending' | 'processing' | 'completed' | 'failed';
      progress: number;
      current_stage?: string;
      created_at: string;
      updated_at: string;
      completed_at?: string;
      processing_time_ms?: number;
      results?: {
        verdict: string;
        confidence: number;
        risk_level: string;
        summary: string;
        ensemble_score?: number;
        video_analysis?: VideoAnalysisData;
      };
      error?: {
        code: string;
        message: string;
      };
    };
    links?: {
      self: string;
    };
  };
}

export interface DemoSubmitResponse {
  data: {
    id: string;
    type: 'demo_video_analysis';
    attributes: {
      status: string;
      progress: number;
      current_stage: string;
      created_at: string;
    };
    links: {
      self: string;
    };
  };
}

export async function submitDemoVideoAnalysis(
  youtubeUrl: string
): Promise<DemoSubmitResponse> {
  const response = await fetch('/api/v1/demo/analyze/video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ youtube_url: youtubeUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new DemoAnalysisError(
      error.detail?.code || 'UNKNOWN_ERROR',
      error.detail?.message || 'Failed to submit video analysis',
      error.detail?.retry_after_seconds
    );
  }

  return response.json();
}

export async function getDemoAnalysisStatus(
  analysisId: string
): Promise<DemoVideoAnalysisResponse> {
  const response = await fetch(`/api/v1/demo/analysis/${analysisId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new DemoAnalysisError(
      error.detail?.code || 'UNKNOWN_ERROR',
      error.detail?.message || 'Failed to get analysis status'
    );
  }

  return response.json();
}

export class DemoAnalysisError extends Error {
  code: string;
  retryAfterSeconds?: number;

  constructor(code: string, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'DemoAnalysisError';
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function getDemoStageLabel(stage: string | undefined): string {
  const labels: Record<string, string> = {
    idle: 'Ready',
    submitting: 'Submitting...',
    queued: 'Queued',
    downloading: 'Downloading video...',
    extracting: 'Extracting frames...',
    analyzing: 'Analyzing frames...',
    aggregating: 'Finishing up...',
    complete: 'Complete',
    completed: 'Complete',
    error: 'Error',
    failed: 'Failed',
  };
  return labels[stage || ''] || stage || 'Processing...';
}

export function mapBackendStageToDemoStage(
  backendStage: string | undefined,
  status: string
): DemoVideoStage {
  if (status === 'completed') return 'complete';
  if (status === 'failed') return 'error';

  switch (backendStage) {
    case 'queued':
    case 'downloading':
      return 'downloading';
    case 'extracting':
    case 'extracting_frames':
      return 'extracting';
    case 'analyzing':
      return 'analyzing';
    case 'aggregating':
    case 'complete':
      return 'complete';
    default:
      return 'downloading';
  }
}
