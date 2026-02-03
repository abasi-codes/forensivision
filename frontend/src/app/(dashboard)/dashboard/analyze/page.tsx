'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Key,
  BarChart3,
  FileImage,
  Settings,
  Loader2,
  X,
  FileVideo,
  Youtube,
  AlertCircle,
  CheckCircle2,
  Clock,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { cn, formatBytes } from '@/lib/utils';
import {
  isValidYouTubeUrl,
  submitVideoAnalysis,
  getAnalysisStatus,
  getStageLabel,
  type VideoAnalysisResponse,
  type FrameResult,
  type SuspiciousSegment,
} from '@/lib/api/video';

type UploadState = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
type AnalysisTab = 'upload' | 'youtube';
type VideoAnalysisState = 'idle' | 'submitting' | 'processing' | 'complete' | 'error';

interface UploadedFile {
  file: File;
  preview: string;
  state: UploadState;
  progress: number;
  analysisId?: string;
  error?: string;
}

interface VideoAnalysis {
  state: VideoAnalysisState;
  analysisId?: string;
  progress: number;
  currentStage?: string;
  error?: string;
  results?: {
    verdict: string;
    confidence: number;
    risk_level: string;
    summary: string;
    video_analysis?: {
      youtube_id: string;
      youtube_title: string;
      frames_analyzed: number;
      frame_results: FrameResult[];
      suspicious_segments: SuspiciousSegment[];
    };
  };
}

export default function AnalyzePage() {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('upload');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [options, setOptions] = useState({
    includeHeatmap: true,
    detailLevel: 'standard',
  });

  // YouTube URL state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysis>({
    state: 'idle',
    progress: 0,
  });
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      state: 'idle' as UploadState,
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'],
      'video/*': ['.mp4', '.mov', '.webm'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const startAnalysis = async () => {
    // Update all files to uploading state
    setFiles((prev) =>
      prev.map((f) => ({
        ...f,
        state: 'uploading',
        progress: 0,
      }))
    );

    // Simulate upload and processing for each file
    for (let i = 0; i < files.length; i++) {
      // Simulate upload
      await new Promise((r) => setTimeout(r, 500));
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, state: 'processing', progress: 50 } : f
        )
      );

      // Simulate processing
      await new Promise((r) => setTimeout(r, 1500));
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i
            ? { ...f, state: 'complete', progress: 100, analysisId: `analysis_${Date.now()}` }
            : f
        )
      );
    }
  };

  // YouTube URL validation
  const validateUrl = (url: string) => {
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

  // Poll for video analysis status
  const pollAnalysisStatus = async (analysisId: string) => {
    try {
      const response = await getAnalysisStatus(analysisId);
      const attrs = response.data.attributes;

      setVideoAnalysis((prev) => ({
        ...prev,
        progress: attrs.progress,
        currentStage: attrs.current_stage,
      }));

      if (attrs.status === 'completed') {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setVideoAnalysis({
          state: 'complete',
          analysisId,
          progress: 100,
          currentStage: 'completed',
          results: attrs.results,
        });
      } else if (attrs.status === 'failed') {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setVideoAnalysis({
          state: 'error',
          analysisId,
          progress: 0,
          error: attrs.error?.message || 'Analysis failed',
        });
      }
    } catch (error) {
      console.error('Failed to poll status:', error);
    }
  };

  // Submit YouTube URL for analysis
  const submitYoutubeAnalysis = async () => {
    if (!youtubeUrl || urlError) return;

    setVideoAnalysis({
      state: 'submitting',
      progress: 0,
    });

    try {
      const response = await submitVideoAnalysis({
        youtube_url: youtubeUrl,
        options: {
          include_heatmap: options.includeHeatmap,
          detail_level: options.detailLevel as 'basic' | 'standard' | 'comprehensive',
        },
      });

      const analysisId = response.data.id;

      setVideoAnalysis({
        state: 'processing',
        analysisId,
        progress: response.data.attributes.progress,
        currentStage: response.data.attributes.current_stage,
      });

      // Start polling for status updates
      pollingRef.current = setInterval(() => {
        pollAnalysisStatus(analysisId);
      }, 2000);
    } catch (error) {
      setVideoAnalysis({
        state: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Failed to submit analysis',
      });
    }
  };

  const resetVideoAnalysis = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setVideoAnalysis({ state: 'idle', progress: 0 });
    setYoutubeUrl('');
    setUrlError(null);
  };

  const allComplete = files.length > 0 && files.every((f) => f.state === 'complete');
  const isProcessing = files.some((f) => f.state === 'uploading' || f.state === 'processing');
  const isVideoProcessing = videoAnalysis.state === 'submitting' || videoAnalysis.state === 'processing';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 border-r p-4 flex flex-col">
        <Link href="/dashboard" className="flex items-center gap-2 mb-8">
          <Logo size={32} />
          <span className="text-xl font-bold">ForensiVision</span>
        </Link>

        <nav className="flex-1 space-y-2">
          <NavItem icon={<BarChart3 />} label="Dashboard" href="/dashboard" />
          <NavItem icon={<Upload />} label="New Analysis" href="/dashboard/analyze" active />
          <NavItem icon={<FileImage />} label="Results" href="/dashboard/results" />
          <NavItem icon={<Key />} label="API Keys" href="/dashboard/api-keys" />
          <NavItem icon={<Settings />} label="Settings" href="/dashboard/settings" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">New Analysis</h1>
            <p className="text-muted-foreground">
              Upload images or videos to analyze for AI-generated content
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('upload')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition',
                activeTab === 'upload'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white dark:bg-slate-900 border hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              <Upload className="h-4 w-4" />
              Upload File
            </button>
            <button
              onClick={() => setActiveTab('youtube')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition',
                activeTab === 'youtube'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white dark:bg-slate-900 border hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              <Youtube className="h-4 w-4" />
              YouTube URL
            </button>
          </div>

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <>
              {/* Upload Zone */}
              <div
                {...getRootProps()}
                className={cn(
                  'bg-white dark:bg-slate-900 border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition mb-6',
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                )}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                </p>
                <p className="text-muted-foreground mb-4">or click to select files</p>
                <p className="text-sm text-muted-foreground">
                  Images (JPG, PNG, WebP) up to 50MB | Videos (MP4, MOV) up to 500MB
                </p>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border rounded-lg mb-6">
                  <div className="p-4 border-b">
                    <h2 className="font-semibold">Files ({files.length})</h2>
                  </div>

                  <div className="divide-y">
                    {files.map((uploadedFile, index) => (
                      <div key={index} className="flex items-center gap-4 p-4">
                        {uploadedFile.preview ? (
                          <img
                            src={uploadedFile.preview}
                            alt=""
                            className="h-12 w-12 object-cover rounded"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center">
                            <FileVideo className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{uploadedFile.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatBytes(uploadedFile.file.size)}
                          </p>

                          {uploadedFile.state !== 'idle' && (
                            <div className="mt-2 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full transition-all',
                                  uploadedFile.state === 'complete'
                                    ? 'bg-green-500'
                                    : uploadedFile.state === 'error'
                                    ? 'bg-red-500'
                                    : 'bg-primary'
                                )}
                                style={{ width: `${uploadedFile.progress}%` }}
                              />
                            </div>
                          )}
                        </div>

                        <div className="shrink-0">
                          {uploadedFile.state === 'idle' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(index);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          {(uploadedFile.state === 'uploading' ||
                            uploadedFile.state === 'processing') && (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          )}
                          {uploadedFile.state === 'complete' && (
                            <Link href={`/dashboard/results/${uploadedFile.analysisId}`}>
                              <Button variant="ghost" size="sm">
                                View Results
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Options */}
              {files.length > 0 && !allComplete && (
                <div className="bg-white dark:bg-slate-900 border rounded-lg mb-6 p-6">
                  <h2 className="font-semibold mb-4">Analysis Options</h2>

                  <div className="space-y-4">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={options.includeHeatmap}
                        onChange={(e) =>
                          setOptions((prev) => ({ ...prev, includeHeatmap: e.target.checked }))
                        }
                        className="rounded"
                      />
                      <span>Include heatmap visualization</span>
                    </label>

                    <div>
                      <label className="block text-sm font-medium mb-2">Detail Level</label>
                      <select
                        value={options.detailLevel}
                        onChange={(e) =>
                          setOptions((prev) => ({ ...prev, detailLevel: e.target.value }))
                        }
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="basic">Basic - Quick overview</option>
                        <option value="standard">Standard - Detailed breakdown</option>
                        <option value="comprehensive">Comprehensive - Full forensic report</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              {files.length > 0 && (
                <div className="flex justify-end gap-4">
                  {!allComplete && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setFiles([])}
                        disabled={isProcessing}
                      >
                        Clear All
                      </Button>
                      <Button onClick={startAnalysis} disabled={isProcessing}>
                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isProcessing ? 'Analyzing...' : `Analyze ${files.length} File(s)`}
                      </Button>
                    </>
                  )}
                  {allComplete && (
                    <Button onClick={() => setFiles([])}>Start New Analysis</Button>
                  )}
                </div>
              )}
            </>
          )}

          {/* YouTube Tab */}
          {activeTab === 'youtube' && (
            <>
              {/* YouTube URL Input */}
              {videoAnalysis.state === 'idle' && (
                <>
                  <div className="bg-white dark:bg-slate-900 border rounded-lg p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Youtube className="h-6 w-6 text-red-500" />
                      <h2 className="font-semibold">Analyze YouTube Video</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Paste a YouTube URL to analyze the video for AI-generated content.
                      Maximum duration: 5 minutes.
                    </p>

                    <div className="space-y-2">
                      <input
                        type="url"
                        value={youtubeUrl}
                        onChange={(e) => {
                          setYoutubeUrl(e.target.value);
                          validateUrl(e.target.value);
                        }}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className={cn(
                          'w-full px-4 py-3 border rounded-lg text-lg',
                          urlError && 'border-red-500 focus:ring-red-500'
                        )}
                      />
                      {urlError && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {urlError}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  {youtubeUrl && !urlError && (
                    <div className="bg-white dark:bg-slate-900 border rounded-lg mb-6 p-6">
                      <h2 className="font-semibold mb-4">Analysis Options</h2>

                      <div className="space-y-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={options.includeHeatmap}
                            onChange={(e) =>
                              setOptions((prev) => ({ ...prev, includeHeatmap: e.target.checked }))
                            }
                            className="rounded"
                          />
                          <span>Include heatmap visualization</span>
                        </label>

                        <div>
                          <label className="block text-sm font-medium mb-2">Detail Level</label>
                          <select
                            value={options.detailLevel}
                            onChange={(e) =>
                              setOptions((prev) => ({ ...prev, detailLevel: e.target.value }))
                            }
                            className="w-full px-3 py-2 border rounded-md"
                          >
                            <option value="basic">Basic - Quick overview</option>
                            <option value="standard">Standard - Detailed breakdown</option>
                            <option value="comprehensive">Comprehensive - Full forensic report</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end">
                    <Button
                      onClick={submitYoutubeAnalysis}
                      disabled={!youtubeUrl || !!urlError}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Analyze Video
                    </Button>
                  </div>
                </>
              )}

              {/* Processing State */}
              {(videoAnalysis.state === 'submitting' || videoAnalysis.state === 'processing') && (
                <div className="bg-white dark:bg-slate-900 border rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <h2 className="font-semibold">Analyzing Video</h2>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">
                        {getStageLabel(videoAnalysis.currentStage)}
                      </span>
                      <span className="font-medium">{videoAnalysis.progress}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${videoAnalysis.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Stage Indicators */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <StageIndicator
                      label="Download"
                      active={videoAnalysis.currentStage === 'downloading'}
                      complete={videoAnalysis.progress > 20}
                    />
                    <StageIndicator
                      label="Extract"
                      active={videoAnalysis.currentStage === 'extracting_frames'}
                      complete={videoAnalysis.progress > 30}
                    />
                    <StageIndicator
                      label="Analyze"
                      active={videoAnalysis.currentStage?.startsWith('analyzing') ?? false}
                      complete={videoAnalysis.progress > 90}
                    />
                    <StageIndicator
                      label="Complete"
                      active={false}
                      complete={videoAnalysis.progress === 100}
                    />
                  </div>
                </div>
              )}

              {/* Error State */}
              {videoAnalysis.state === 'error' && (
                <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                    <h2 className="font-semibold text-red-500">Analysis Failed</h2>
                  </div>
                  <p className="text-muted-foreground mb-6">{videoAnalysis.error}</p>
                  <Button onClick={resetVideoAnalysis}>Try Again</Button>
                </div>
              )}

              {/* Complete State with Results */}
              {videoAnalysis.state === 'complete' && videoAnalysis.results && (
                <div className="space-y-6">
                  {/* Success Header */}
                  <div className="bg-white dark:bg-slate-900 border rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                      <h2 className="font-semibold">Analysis Complete</h2>
                    </div>

                    {/* Verdict */}
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={cn(
                          'px-4 py-2 rounded-lg font-semibold text-lg',
                          getVerdictStyle(videoAnalysis.results.verdict)
                        )}
                      >
                        {formatVerdict(videoAnalysis.results.verdict)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Confidence: {(videoAnalysis.results.confidence * 100).toFixed(1)}%
                      </div>
                    </div>

                    <p className="text-muted-foreground">{videoAnalysis.results.summary}</p>
                  </div>

                  {/* Frame Timeline */}
                  {videoAnalysis.results.video_analysis && (
                    <div className="bg-white dark:bg-slate-900 border rounded-lg p-6">
                      <h3 className="font-semibold mb-4">Frame-by-Frame Analysis</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Analyzed {videoAnalysis.results.video_analysis.frames_analyzed} frames
                      </p>

                      {/* Timeline Visualization */}
                      <div className="relative h-20 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden mb-4">
                        {videoAnalysis.results.video_analysis.frame_results.map((frame, idx) => {
                          const totalFrames = videoAnalysis.results!.video_analysis!.frame_results.length;
                          const left = (idx / totalFrames) * 100;
                          const color = getAIProbabilityColor(frame.ai_probability);

                          return (
                            <div
                              key={idx}
                              className="absolute bottom-0 w-1"
                              style={{
                                left: `${left}%`,
                                height: `${frame.ai_probability * 100}%`,
                                backgroundColor: color,
                              }}
                              title={`${frame.timestamp}s: ${(frame.ai_probability * 100).toFixed(0)}% AI probability`}
                            />
                          );
                        })}

                        {/* Suspicious segment overlays */}
                        {videoAnalysis.results.video_analysis.suspicious_segments.map((seg, idx) => {
                          const totalDuration = videoAnalysis.results!.video_analysis!.frame_results.length;
                          const left = (seg.start / totalDuration) * 100;
                          const width = ((seg.end - seg.start) / totalDuration) * 100;

                          return (
                            <div
                              key={idx}
                              className="absolute top-0 h-2 bg-red-500/50"
                              style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
                              title={`Suspicious: ${seg.start}s - ${seg.end}s`}
                            />
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-green-500 rounded" />
                          <span>Authentic</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-yellow-500 rounded" />
                          <span>Uncertain</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-red-500 rounded" />
                          <span>AI Detected</span>
                        </div>
                      </div>

                      {/* Suspicious Segments List */}
                      {videoAnalysis.results.video_analysis.suspicious_segments.length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-medium mb-3">Suspicious Segments</h4>
                          <div className="space-y-2">
                            {videoAnalysis.results.video_analysis.suspicious_segments.map((seg, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg"
                              >
                                <Clock className="h-4 w-4 text-red-500" />
                                <span className="font-mono">
                                  {formatTime(seg.start)} - {formatTime(seg.end)}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {(seg.avg_ai_probability * 100).toFixed(0)}% AI probability
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={resetVideoAnalysis}>
                      Analyze Another Video
                    </Button>
                    {videoAnalysis.analysisId && (
                      <Link href={`/dashboard/results/${videoAnalysis.analysisId}`}>
                        <Button>View Full Report</Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({
  icon,
  label,
  href,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg transition',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
}

function StageIndicator({
  label,
  active,
  complete,
}: {
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1',
        active && 'text-primary font-medium',
        complete && 'text-green-500'
      )}
    >
      <div
        className={cn(
          'w-3 h-3 rounded-full',
          complete ? 'bg-green-500' : active ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
        )}
      />
      <span className="text-xs">{label}</span>
    </div>
  );
}

function getVerdictStyle(verdict: string): string {
  switch (verdict) {
    case 'ai_generated':
      return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400';
    case 'likely_ai':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400';
    case 'inconclusive':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400';
    case 'likely_authentic':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400';
    case 'authentic':
      return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
  }
}

function formatVerdict(verdict: string): string {
  const labels: Record<string, string> = {
    ai_generated: 'AI Generated',
    likely_ai: 'Likely AI',
    inconclusive: 'Inconclusive',
    likely_authentic: 'Likely Authentic',
    authentic: 'Authentic',
  };
  return labels[verdict] || verdict;
}

function getAIProbabilityColor(probability: number): string {
  if (probability >= 0.65) return '#ef4444'; // red
  if (probability >= 0.35) return '#eab308'; // yellow
  return '#22c55e'; // green
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
