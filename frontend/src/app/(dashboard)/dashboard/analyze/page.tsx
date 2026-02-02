'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import {
  Shield,
  Upload,
  Key,
  BarChart3,
  FileImage,
  Settings,
  LogOut,
  Loader2,
  X,
  FileVideo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatBytes } from '@/lib/utils';

type UploadState = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

interface UploadedFile {
  file: File;
  preview: string;
  state: UploadState;
  progress: number;
  analysisId?: string;
  error?: string;
}

export default function AnalyzePage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [options, setOptions] = useState({
    includeHeatmap: true,
    detailLevel: 'standard',
  });

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

  const allComplete = files.length > 0 && files.every((f) => f.state === 'complete');
  const isProcessing = files.some((f) => f.state === 'uploading' || f.state === 'processing');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 border-r p-4 flex flex-col">
        <Link href="/dashboard" className="flex items-center gap-2 mb-8">
          <Shield className="h-8 w-8 text-primary" />
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
