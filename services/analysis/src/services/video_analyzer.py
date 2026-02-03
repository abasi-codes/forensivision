"""Synchronous video analysis service."""

import asyncio
import json
import logging
import os
import shutil
import tempfile
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from src.core.database import get_db
from src.detectors.image_detector import ImageDetector
from src.video.downloader import VideoDownloader, VideoInfo, DownloadError
from src.video.frame_extractor import FrameExtractor, ExtractedFrame

logger = logging.getLogger(__name__)

# Demo constraints
DEMO_MAX_DURATION = 20
DEMO_MAX_FRAMES = 20


@dataclass
class FrameAnalysisResult:
    """Result of analyzing a single frame."""
    timestamp: float
    ai_probability: float
    verdict: str
    confidence: float


@dataclass
class SuspiciousSegment:
    """A segment of video with high AI probability."""
    start: float
    end: float
    avg_ai_probability: float


class VideoAnalyzer:
    """Synchronous video analyzer that processes videos directly."""

    SUSPICIOUS_THRESHOLD = 0.65
    SEGMENT_GAP_THRESHOLD = 3.0

    def __init__(self):
        self.image_detector = ImageDetector()
        self.frame_extractor = FrameExtractor(frames_per_second=1)

    async def analyze_demo_video(
        self,
        analysis_id: UUID,
        youtube_url: str,
    ) -> None:
        """
        Analyze a demo video synchronously.

        Updates database with progress and stores results.
        """
        temp_dir = None
        video_path = None

        try:
            temp_dir = tempfile.mkdtemp(prefix="demo_video_")
            logger.info(f"Starting demo video analysis: {analysis_id}")

            # Update status: downloading
            await self._update_status(analysis_id, "processing", 5, "downloading")

            # Download video
            downloader = VideoDownloader(temp_dir=temp_dir, max_duration=DEMO_MAX_DURATION)
            video_info = await downloader.download(youtube_url)
            video_path = video_info.file_path

            # Update file info
            await self._update_file_info(analysis_id, video_info)

            # Update status: extracting frames
            await self._update_status(analysis_id, "processing", 20, "extracting")

            # Extract frames
            frames = await self.frame_extractor.extract(
                video_path,
                max_frames=DEMO_MAX_FRAMES,
            )

            # Update status: analyzing
            await self._update_status(analysis_id, "processing", 30, "analyzing")

            # Analyze frames
            frame_results = await self._analyze_frames(analysis_id, frames)

            # Aggregate and store results
            await self._update_status(analysis_id, "processing", 90, "complete")
            await self._aggregate_and_store_results(analysis_id, video_info, frame_results)

            # Mark as completed
            await self._update_status(analysis_id, "completed", 100, None)
            logger.info(f"Completed demo video analysis: {analysis_id}")

        except DownloadError as e:
            logger.error(f"Download error: {e.code} - {e.message}")
            await self._update_status(
                analysis_id, "failed", 0, None,
                error_code=e.code, error_message=e.message
            )
        except Exception as e:
            logger.error(f"Failed to process video: {e}", exc_info=True)
            await self._update_status(
                analysis_id, "failed", 0, None,
                error_code="PROCESSING_ERROR", error_message=str(e)
            )
        finally:
            if temp_dir and os.path.exists(temp_dir):
                try:
                    shutil.rmtree(temp_dir)
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp dir: {e}")

    async def _analyze_frames(
        self,
        analysis_id: UUID,
        frames: List[ExtractedFrame],
    ) -> List[FrameAnalysisResult]:
        """Analyze each frame."""
        results: List[FrameAnalysisResult] = []
        total_frames = len(frames)

        for i, frame in enumerate(frames):
            frame_bytes = self.frame_extractor.frame_to_bytes(frame, format="png")
            detection_result = await self.image_detector.detect(frame_bytes, {})
            ai_probability = self._extract_ai_probability(detection_result)

            results.append(
                FrameAnalysisResult(
                    timestamp=frame.timestamp,
                    ai_probability=ai_probability,
                    verdict=detection_result["verdict"],
                    confidence=detection_result["confidence"],
                )
            )

            # Update progress
            progress = 30 + int((i / total_frames) * 60)
            await self._update_status(
                analysis_id, "processing", progress,
                f"analyzing ({i + 1}/{total_frames})"
            )

        return results

    def _extract_ai_probability(self, detection_result: dict) -> float:
        """Extract AI probability from detection result."""
        if detection_result.get("ensemble_score") is not None:
            return detection_result["ensemble_score"]

        confidence = detection_result.get("confidence", 0.5)
        verdict = detection_result.get("verdict", "inconclusive")

        if verdict in ("ai_generated", "likely_ai"):
            return confidence
        elif verdict in ("authentic", "likely_authentic"):
            return 1 - confidence
        else:
            return 0.5

    async def _aggregate_and_store_results(
        self,
        analysis_id: UUID,
        video_info: VideoInfo,
        frame_results: List[FrameAnalysisResult],
    ) -> None:
        """Aggregate results and store in database."""
        if frame_results:
            avg_ai_prob = sum(r.ai_probability for r in frame_results) / len(frame_results)
            max_ai_prob = max(r.ai_probability for r in frame_results)
        else:
            avg_ai_prob = 0.0
            max_ai_prob = 0.0

        suspicious_segments = self._find_suspicious_segments(frame_results)
        verdict, confidence, risk_level = self._determine_verdict(
            avg_ai_prob, max_ai_prob, suspicious_segments
        )

        video_analysis = {
            "youtube_id": video_info.video_id,
            "youtube_title": video_info.title,
            "frames_analyzed": len(frame_results),
            "frame_results": [
                {
                    "timestamp": r.timestamp,
                    "ai_probability": round(r.ai_probability, 3),
                }
                for r in frame_results
            ],
            "suspicious_segments": [
                {
                    "start": seg.start,
                    "end": seg.end,
                    "avg_ai_probability": round(seg.avg_ai_probability, 3),
                }
                for seg in suspicious_segments
            ],
        }

        summary = self._generate_summary(
            video_info, frame_results, suspicious_segments, verdict
        )

        await self._store_result(
            analysis_id,
            verdict=verdict,
            confidence=confidence,
            risk_level=risk_level,
            summary=summary,
            video_analysis=video_analysis,
        )

    def _find_suspicious_segments(
        self, frame_results: List[FrameAnalysisResult]
    ) -> List[SuspiciousSegment]:
        """Find contiguous segments with high AI probability."""
        segments: List[SuspiciousSegment] = []
        current_segment_frames: List[FrameAnalysisResult] = []

        for result in frame_results:
            if result.ai_probability >= self.SUSPICIOUS_THRESHOLD:
                if current_segment_frames:
                    gap = result.timestamp - current_segment_frames[-1].timestamp
                    if gap > self.SEGMENT_GAP_THRESHOLD:
                        segments.append(self._create_segment(current_segment_frames))
                        current_segment_frames = []
                current_segment_frames.append(result)
            else:
                if current_segment_frames:
                    segments.append(self._create_segment(current_segment_frames))
                    current_segment_frames = []

        if current_segment_frames:
            segments.append(self._create_segment(current_segment_frames))

        return segments

    def _create_segment(self, frames: List[FrameAnalysisResult]) -> SuspiciousSegment:
        """Create a suspicious segment."""
        return SuspiciousSegment(
            start=frames[0].timestamp,
            end=frames[-1].timestamp,
            avg_ai_probability=sum(f.ai_probability for f in frames) / len(frames),
        )

    def _determine_verdict(
        self,
        avg_ai_prob: float,
        max_ai_prob: float,
        suspicious_segments: List[SuspiciousSegment],
    ) -> tuple:
        """Determine overall verdict."""
        if avg_ai_prob >= 0.7 or (max_ai_prob >= 0.9 and len(suspicious_segments) > 2):
            return "ai_generated", avg_ai_prob, "high"
        elif avg_ai_prob >= 0.5 or (max_ai_prob >= 0.75 and len(suspicious_segments) > 0):
            return "likely_ai", avg_ai_prob, "medium"
        elif avg_ai_prob >= 0.35 or suspicious_segments:
            return "inconclusive", avg_ai_prob, "medium"
        elif avg_ai_prob >= 0.2:
            return "likely_authentic", 1 - avg_ai_prob, "low"
        else:
            return "authentic", 1 - avg_ai_prob, "low"

    def _generate_summary(
        self,
        video_info: VideoInfo,
        frame_results: List[FrameAnalysisResult],
        suspicious_segments: List[SuspiciousSegment],
        verdict: str,
    ) -> str:
        """Generate summary."""
        total_frames = len(frame_results)
        suspicious_frames = sum(
            1 for r in frame_results if r.ai_probability >= self.SUSPICIOUS_THRESHOLD
        )

        if verdict == "ai_generated":
            summary = "This video shows strong indicators of AI-generated content. "
        elif verdict == "likely_ai":
            summary = "This video shows moderate indicators of AI-generated content. "
        elif verdict == "inconclusive":
            summary = "The analysis was inconclusive. "
        elif verdict == "likely_authentic":
            summary = "This video appears to be mostly authentic. "
        else:
            summary = "This video appears to be authentic. "

        summary += f"Analyzed {total_frames} frames over {video_info.duration_seconds:.0f} seconds. "

        if suspicious_frames > 0:
            summary += f"{suspicious_frames} frames ({suspicious_frames/total_frames*100:.0f}%) showed elevated AI probability. "

        if suspicious_segments:
            summary += f"Found {len(suspicious_segments)} suspicious segment(s). "

        return summary.strip()

    async def _update_status(
        self,
        analysis_id: UUID,
        status: str,
        progress: int,
        stage: Optional[str],
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """Update analysis status in database."""
        db = await get_db()
        await db.execute(
            """
            UPDATE analyses
            SET status = $2::analysis_status, progress = $3, current_stage = $4,
                error_code = $5, error_message = $6,
                processing_started_at = CASE WHEN $2 = 'processing' AND processing_started_at IS NULL THEN NOW() ELSE processing_started_at END,
                processing_completed_at = CASE WHEN $2 IN ('completed', 'failed') THEN NOW() ELSE processing_completed_at END,
                updated_at = NOW()
            WHERE id = $1
            """,
            analysis_id,
            status,
            progress,
            stage,
            error_code,
            error_message,
        )

    async def _update_file_info(self, analysis_id: UUID, video_info: VideoInfo) -> None:
        """Update file info in database."""
        db = await get_db()
        await db.execute(
            """
            UPDATE analyses
            SET file_name = $2, file_size_bytes = $3, file_mime_type = $4,
                duration_seconds = $5, resolution = $6, fps = $7,
                updated_at = NOW()
            WHERE id = $1
            """,
            analysis_id,
            video_info.title,
            video_info.file_size_bytes,
            "video/mp4",
            video_info.duration_seconds,
            video_info.resolution,
            video_info.fps,
        )

    async def _store_result(
        self,
        analysis_id: UUID,
        verdict: str,
        confidence: float,
        risk_level: str,
        summary: str,
        video_analysis: dict,
    ) -> None:
        """Store analysis result."""
        detections = [
            {
                "model": "video_frame_analyzer",
                "verdict": verdict,
                "confidence": confidence,
                "details": {
                    "frames_analyzed": video_analysis["frames_analyzed"],
                    "suspicious_segments": len(video_analysis["suspicious_segments"]),
                },
            }
        ]

        db = await get_db()
        await db.execute(
            """
            INSERT INTO analysis_results (
                id, analysis_id, verdict, confidence, risk_level, summary,
                detections, ensemble_score, video_analysis, created_at
            ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW()
            )
            """,
            analysis_id,
            verdict,
            confidence,
            risk_level,
            summary,
            json.dumps(detections),
            confidence,
            json.dumps(video_analysis),
        )


# Singleton instance
video_analyzer = VideoAnalyzer()
