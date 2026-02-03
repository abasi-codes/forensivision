'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, Loader2, CheckCircle, AlertCircle, HelpCircle, Youtube, Link2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn, formatBytes, formatConfidence, formatVerdict, getVerdictColor } from '@/lib/utils';
import { useAIDetector } from '@/lib/hooks/use-ai-detector';
import { DetectionResult } from '@/lib/ai-detector';
import {
  isValidYouTubeUrl,
  extractYouTubeId,
  submitDemoVideoAnalysis,
  getDemoAnalysisStatus,
  DemoAnalysisError,
  DemoVideoStage,
  getDemoStageLabel,
  mapBackendStageToDemoStage,
  FrameResult,
} from '@/lib/api/video';

type AnalysisState = 'idle' | 'loading-model' | 'processing' | 'complete' | 'error';
type InputMode = 'image' | 'youtube';

interface AnalysisResult {
  verdict: string;
  confidence: number;
  summary: string;
  isVideo?: boolean;
  videoTitle?: string;
  frameResults?: FrameResult[];
  framesAnalyzed?: number;
}

interface VideoProgress {
  stage: DemoVideoStage;
  progress: number;
  framesAnalyzed?: number;
  totalFrames?: number;
}

function getVerdictSummary(result: DetectionResult): string {
  switch (result.verdict) {
    case 'ai_generated':
      return `This image shows strong indicators of AI generation (${(result.aiProbability * 100).toFixed(1)}% AI probability). It was likely created using a diffusion-based model like Stable Diffusion, DALL-E, or Midjourney.`;
    case 'authentic':
      return `This image appears to be an authentic photograph (${(result.authenticProbability * 100).toFixed(1)}% authentic probability). No significant signs of AI generation were detected.`;
    case 'inconclusive':
      return `The analysis is inconclusive (${(result.aiProbability * 100).toFixed(1)}% AI probability). The image may be heavily edited, compressed, or have characteristics that make classification difficult.`;
    default:
      return 'Analysis complete.';
  }
}

function getVerdictIcon(verdict: string) {
  switch (verdict) {
    case 'authentic':
      return <CheckCircle className="h-5 w-5 text-authentic" />;
    case 'ai_generated':
      return <AlertCircle className="h-5 w-5 text-ai" />;
    case 'inconclusive':
      return <HelpCircle className="h-5 w-5 text-yellow-500" />;
    default:
      return null;
  }
}

export function QuickUpload() {
  const [mode, setMode] = useState<InputMode>('image');
  const [state, setState] = useState<AnalysisState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // YouTube state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  // Video analysis progress
  const [videoProgress, setVideoProgress] = useState<VideoProgress>({
    stage: 'idle',
    progress: 0,
  });
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { status: detectorStatus, detect, loadModel } = useAIDetector();

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFile(file);
    setPreview(URL.createObjectURL(file));
    setError(null);
    setResult(null);

    // Run analysis
    await analyzeFile(file);
  }, []);

  const analyzeFile = async (file: File) => {
    try {
      // Load model if not already loaded
      if (!detectorStatus.isLoaded) {
        setState('loading-model');
        await loadModel();
      }

      setState('processing');

      // Run actual AI detection
      const detectionResult = await detect(file);

      const analysisResult: AnalysisResult = {
        verdict: detectionResult.verdict,
        confidence: detectionResult.confidence,
        summary: getVerdictSummary(detectionResult),
      };

      setResult(analysisResult);
      setState('complete');
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
      setState('error');
    }
  };

  const validateYoutubeUrl = (url: string) => {
    setYoutubeUrl(url);
    if (!url) {
      setUrlError(null);
      return;
    }
    if (!isValidYouTubeUrl(url)) {
      setUrlError('Please enter a valid YouTube URL');
    } else {
      setUrlError(null);
    }
  };

  const analyzeYoutubeVideo = async () => {
    if (!youtubeUrl || urlError) return;

    setError(null);
    setResult(null);
    setVideoProgress({ stage: 'submitting', progress: 0 });

    // Extract video ID for thumbnail
    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
      setError('Could not extract video ID from URL');
      setState('error');
      setVideoProgress({ stage: 'error', progress: 0 });
      return;
    }

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    setPreview(thumbnailUrl);

    try {
      setState('processing');

      // Submit to demo endpoint
      const submitResponse = await submitDemoVideoAnalysis(youtubeUrl);
      const analysisId = submitResponse.data.id;

      setVideoProgress({ stage: 'downloading', progress: 5 });

      // Poll for progress every 500ms
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusResponse = await getDemoAnalysisStatus(analysisId);
          const attrs = statusResponse.data.attributes;

          // Map backend stage to frontend stage
          const stage = mapBackendStageToDemoStage(attrs.current_stage, attrs.status);
          setVideoProgress({
            stage,
            progress: attrs.progress,
          });

          // Check if completed
          if (attrs.status === 'completed' && attrs.results) {
            // Clear polling
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

            const videoAnalysis = attrs.results.video_analysis;
            const analysisResult: AnalysisResult = {
              verdict: attrs.results.verdict,
              confidence: attrs.results.confidence,
              summary: attrs.results.summary,
              isVideo: true,
              frameResults: videoAnalysis?.frame_results,
              framesAnalyzed: videoAnalysis?.frames_analyzed,
            };

            setResult(analysisResult);
            setState('complete');
            setVideoProgress({ stage: 'complete', progress: 100 });
          }

          // Check if failed
          if (attrs.status === 'failed') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

            setError(attrs.error?.message || 'Video analysis failed');
            setState('error');
            setVideoProgress({ stage: 'error', progress: 0 });
          }
        } catch (pollErr) {
          console.error('Polling error:', pollErr);
          // Don't clear interval on transient errors, just log
        }
      }, 500);

    } catch (err) {
      console.error('Video analysis failed:', err);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      if (err instanceof DemoAnalysisError) {
        if (err.code === 'RATE_LIMIT_EXCEEDED') {
          setError(err.message);
        } else if (err.code === 'VIDEO_TOO_LONG') {
          setError('Video must be 20 seconds or less');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
      }
      setState('error');
      setVideoProgress({ stage: 'error', progress: 0 });
    }
  };

  const reset = () => {
    // Clear polling interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    setState('idle');
    setFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setResult(null);
    setError(null);
    setYoutubeUrl('');
    setUrlError(null);
    setVideoProgress({ stage: 'idle', progress: 0 });
  };

  const switchMode = (newMode: InputMode) => {
    if (state !== 'idle') return;
    setMode(newMode);
    setYoutubeUrl('');
    setUrlError(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 1,
    disabled: state !== 'idle' || mode !== 'image',
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border p-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">Try It Now</h3>
        <p className="text-sm text-muted-foreground">
          {mode === 'image' ? 'Upload an image to check if it\'s AI-generated' : 'Paste a YouTube URL to analyze'}
        </p>
      </div>

      {/* Mode Switcher */}
      {state === 'idle' && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => switchMode('image')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition',
              mode === 'image'
                ? 'bg-primary text-primary-foreground'
                : 'bg-slate-100 dark:bg-slate-700 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-600'
            )}
          >
            <FileImage className="h-4 w-4" />
            Image
          </button>
          <button
            onClick={() => switchMode('youtube')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition',
              mode === 'youtube'
                ? 'bg-primary text-primary-foreground'
                : 'bg-slate-100 dark:bg-slate-700 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-600'
            )}
          >
            <Youtube className="h-4 w-4" />
            Video
          </button>
        </div>
      )}

      {/* Image Upload Mode */}
      {state === 'idle' && mode === 'image' && (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">
            {isDragActive ? 'Drop your image here' : 'Drag & drop an image'}
          </p>
          <p className="text-xs text-muted-foreground">or click to select</p>
          <p className="text-xs text-muted-foreground mt-2">
            JPG, PNG, WebP up to 10MB
          </p>
        </div>
      )}

      {/* YouTube URL Mode */}
      {state === 'idle' && mode === 'youtube' && (
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Link2 className="h-4 w-4" />
            </div>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => validateYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className={cn(
                'w-full pl-10 pr-4 py-3 border rounded-lg text-sm',
                urlError && 'border-red-500 focus:ring-red-500'
              )}
            />
          </div>
          {urlError && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {urlError}
            </p>
          )}
          <Button
            onClick={analyzeYoutubeVideo}
            disabled={!youtubeUrl || !!urlError}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            Analyze Video
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Max 20 seconds. We'll analyze each frame for AI-generated content.
          </p>
        </div>
      )}

      {state === 'loading-model' && (
        <div className="text-center py-8">
          {preview && (
            <div className="mb-4 relative inline-block">
              <img
                src={preview}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg mx-auto opacity-50"
              />
            </div>
          )}
          <Loader2 className="h-8 w-8 mx-auto mb-4 text-primary animate-spin" />
          <p className="text-sm font-medium">Loading AI model...</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            First-time setup (~15-20MB download)
          </p>
          <div className="max-w-xs mx-auto">
            <Progress value={detectorStatus.loadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {detectorStatus.loadProgress}%
            </p>
          </div>
        </div>
      )}

      {state === 'processing' && (
        <div className="text-center py-8">
          {preview && (
            <div className="mb-4 relative inline-block">
              <img
                src={preview}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg mx-auto"
              />
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            </div>
          )}

          {/* Video progress stages */}
          {mode === 'youtube' && (
            <div className="mb-4">
              <VideoProgressStages currentStage={videoProgress.stage} />
              <p className="text-sm font-medium mt-3">
                {getDemoStageLabel(videoProgress.stage)}
              </p>
              <div className="max-w-xs mx-auto mt-2">
                <Progress value={videoProgress.progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {videoProgress.progress}%
                </p>
              </div>
            </div>
          )}

          {mode === 'image' && (
            <p className="text-sm font-medium">Analyzing image...</p>
          )}

          {file && (
            <p className="text-xs text-muted-foreground mt-1">
              {file.name} ({formatBytes(file.size)})
            </p>
          )}
        </div>
      )}

      {state === 'complete' && result && (
        <div className="animate-fade-in">
          <div className="flex gap-4 mb-4">
            {preview && (
              <img
                src={preview}
                alt="Analyzed"
                className="w-20 h-20 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {getVerdictIcon(result.verdict)}
                <span className={cn('font-semibold', getVerdictColor(result.verdict))}>
                  {formatVerdict(result.verdict)}
                </span>
                {result.isVideo && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    Video
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatConfidence(result.confidence)} confidence
              </p>
            </div>
          </div>

          {/* Frame-by-frame results visualization for video */}
          {result.isVideo && result.frameResults && result.frameResults.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">
                Frame-by-frame AI probability ({result.framesAnalyzed} frames analyzed)
              </p>
              <FrameResultsTimeline frameResults={result.frameResults} />
            </div>
          )}

          <p className="text-sm text-muted-foreground mb-4">{result.summary}</p>

          <div className="flex gap-2">
            <Button onClick={reset} variant="outline" className="flex-1">
              Try Another
            </Button>
            <Button asChild className="flex-1">
              <a href="/register">Sign Up for More</a>
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-4">
            {result.isVideo
              ? 'Sign up for longer videos and detailed reports'
              : 'Sign up to see full detection details, heatmaps, and export reports'}
          </p>
        </div>
      )}

      {state === 'error' && (
        <div className="text-center py-8">
          <AlertCircle className="h-10 w-10 mx-auto mb-4 text-destructive" />
          <p className="text-sm font-medium text-destructive mb-2">Analysis Failed</p>
          <p className="text-xs text-muted-foreground mb-4">{error}</p>
          <Button onClick={reset} variant="outline">
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}

// Video progress stages visualization
function VideoProgressStages({ currentStage }: { currentStage: DemoVideoStage }) {
  const stages: { key: DemoVideoStage; label: string }[] = [
    { key: 'downloading', label: 'Download' },
    { key: 'extracting', label: 'Extract' },
    { key: 'analyzing', label: 'Analyze' },
    { key: 'complete', label: 'Complete' },
  ];

  const getStageIndex = (stage: DemoVideoStage) => {
    if (stage === 'idle' || stage === 'submitting') return -1;
    if (stage === 'error') return -1;
    return stages.findIndex((s) => s.key === stage);
  };

  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="flex items-center justify-center gap-2">
      {stages.map((stage, index) => (
        <div key={stage.key} className="flex items-center">
          <div
            className={cn(
              'w-3 h-3 rounded-full transition-colors',
              index < currentIndex
                ? 'bg-primary'
                : index === currentIndex
                ? 'bg-primary animate-pulse'
                : 'bg-slate-200 dark:bg-slate-600'
            )}
          />
          {index < stages.length - 1 && (
            <div
              className={cn(
                'w-8 h-0.5 mx-1',
                index < currentIndex ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Frame-by-frame results visualization
function FrameResultsTimeline({ frameResults }: { frameResults: FrameResult[] }) {
  // Show max 20 frames in the timeline
  const displayResults = frameResults.slice(0, 20);

  return (
    <div className="flex gap-1 justify-center flex-wrap">
      {displayResults.map((frame, i) => {
        const isHighProbability = frame.ai_probability > 0.65;
        const isMediumProbability = frame.ai_probability > 0.35 && frame.ai_probability <= 0.65;

        return (
          <div
            key={i}
            className={cn(
              'w-2 h-8 rounded transition-colors cursor-help',
              isHighProbability
                ? 'bg-red-500'
                : isMediumProbability
                ? 'bg-yellow-500'
                : 'bg-green-500'
            )}
            title={`${frame.timestamp.toFixed(1)}s: ${(frame.ai_probability * 100).toFixed(0)}% AI`}
          />
        );
      })}
    </div>
  );
}
