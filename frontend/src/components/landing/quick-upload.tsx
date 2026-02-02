'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatBytes, formatConfidence, formatVerdict, getVerdictColor } from '@/lib/utils';

type AnalysisState = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

interface MockResult {
  verdict: string;
  confidence: number;
  summary: string;
}

export function QuickUpload() {
  const [state, setState] = useState<AnalysisState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<MockResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFile(file);
    setPreview(URL.createObjectURL(file));
    setError(null);
    setResult(null);

    // Simulate analysis
    analyzeFile(file);
  }, []);

  const analyzeFile = async (file: File) => {
    setState('uploading');

    // Simulate upload delay
    await new Promise((r) => setTimeout(r, 800));

    setState('processing');

    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 1500));

    // Generate mock result
    const mockResult: MockResult = {
      verdict: Math.random() > 0.5 ? 'ai_generated' : 'authentic',
      confidence: 0.7 + Math.random() * 0.25,
      summary:
        Math.random() > 0.5
          ? 'This image shows strong indicators of AI generation, likely from a diffusion-based model.'
          : 'This image appears to be an authentic photograph with no signs of AI generation.',
    };

    setResult(mockResult);
    setState('complete');
  };

  const reset = () => {
    setState('idle');
    setFile(null);
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

      {(state === 'uploading' || state === 'processing') && (
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
          <p className="text-sm font-medium">
            {state === 'uploading' ? 'Uploading...' : 'Analyzing...'}
          </p>
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
                {result.verdict === 'authentic' ? (
                  <CheckCircle className="h-5 w-5 text-authentic" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-ai" />
                )}
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
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button onClick={reset} variant="outline" className="mt-4">
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
