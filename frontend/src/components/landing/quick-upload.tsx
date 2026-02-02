'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, Loader2, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn, formatBytes, formatConfidence, formatVerdict, getVerdictColor } from '@/lib/utils';
import { useAIDetector } from '@/lib/hooks/use-ai-detector';
import { DetectionResult } from '@/lib/ai-detector';

type AnalysisState = 'idle' | 'loading-model' | 'processing' | 'complete' | 'error';

interface AnalysisResult {
  verdict: string;
  confidence: number;
  summary: string;
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
  const [state, setState] = useState<AnalysisState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { status: detectorStatus, detect, loadModel } = useAIDetector();

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

  const reset = () => {
    setState('idle');
    setFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 1,
    disabled: state !== 'idle',
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border p-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">Try It Now</h3>
        <p className="text-sm text-muted-foreground">
          Upload an image to check if it's AI-generated
        </p>
      </div>

      {state === 'idle' && (
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
          <p className="text-sm font-medium">Analyzing image...</p>
          <p className="text-xs text-muted-foreground mt-1">
            {file?.name} ({formatBytes(file?.size || 0)})
          </p>
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
              </div>
              <p className="text-sm text-muted-foreground">
                {formatConfidence(result.confidence)} confidence
              </p>
            </div>
          </div>

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
            Sign up to see full detection details, heatmaps, and export reports
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
