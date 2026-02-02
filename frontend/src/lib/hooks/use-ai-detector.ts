'use client';

/**
 * React Hook for AI Detection
 * Provides easy access to the AI detector service with React state management
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { getDetectorService, DetectionResult, DetectorStatus } from '../ai-detector';

interface UseAIDetectorReturn {
  status: DetectorStatus;
  detect: (file: File) => Promise<DetectionResult>;
  loadModel: () => Promise<void>;
  reset: () => void;
}

export function useAIDetector(): UseAIDetectorReturn {
  const [status, setStatus] = useState<DetectorStatus>({
    isLoaded: false,
    isLoading: false,
    loadProgress: 0,
    error: null,
  });

  const serviceRef = useRef(getDetectorService());

  // Set up progress callback
  useEffect(() => {
    const service = serviceRef.current;
    service.setProgressCallback((progress) => {
      setStatus(prev => ({ ...prev, loadProgress: progress }));
    });

    // Check if already loaded
    const serviceStatus = service.getStatus();
    if (serviceStatus.isLoaded) {
      setStatus(prev => ({ ...prev, isLoaded: true, loadProgress: 100 }));
    }

    return () => {
      service.setProgressCallback(null);
    };
  }, []);

  const loadModel = useCallback(async () => {
    const service = serviceRef.current;

    if (service.getStatus().isLoaded) {
      return;
    }

    setStatus(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      await service.loadModel();
      setStatus(prev => ({
        ...prev,
        isLoaded: true,
        isLoading: false,
        loadProgress: 100,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load model';
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const detect = useCallback(async (file: File): Promise<DetectionResult> => {
    const service = serviceRef.current;

    // Auto-load model if not loaded
    if (!service.getStatus().isLoaded) {
      await loadModel();
    }

    return service.detect(file);
  }, [loadModel]);

  const reset = useCallback(() => {
    setStatus({
      isLoaded: serviceRef.current.getStatus().isLoaded,
      isLoading: false,
      loadProgress: serviceRef.current.getStatus().isLoaded ? 100 : 0,
      error: null,
    });
  }, []);

  return {
    status,
    detect,
    loadModel,
    reset,
  };
}
