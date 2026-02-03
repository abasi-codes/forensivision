"""Video analysis worker for processing YouTube videos."""

import asyncio
import json
import logging
import os
import shutil
import tempfile
from dataclasses import dataclass
from typing import List, Optional

import aio_pika
from aio_pika import IncomingMessage

from src.config import settings
from src.database import Database
from src.detectors.image_detector import ImageDetector
from src.video.downloader import VideoDownloader, DownloadError, VideoInfo
from src.video.frame_extractor import FrameExtractor, ExtractedFrame

logger = logging.getLogger(__name__)

# Demo constraints
DEMO_MAX_DURATION = 20  # seconds
DEMO_MAX_FRAMES = 20  # 1 fps for 20 seconds max


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


class DemoVideoDownloader(VideoDownloader):
    """Video downloader with demo-specific constraints."""

    MAX_DURATION_SECONDS = DEMO_MAX_DURATION


class VideoWorker:
    """Worker for processing video analysis jobs from the queue."""

    # Thresholds
    SUSPICIOUS_THRESHOLD = 0.65  # AI probability threshold for suspicious frames
    SEGMENT_GAP_THRESHOLD = 3.0  # Max gap in seconds to merge suspicious frames

    def __init__(
        self,
        db: Database,
        image_detector: ImageDetector,
    ):
        """
        Initialize the video worker.

        Args:
            db: Database connection.
            image_detector: Detector for analyzing frames.
        """
        self.db = db
        self.image_detector = image_detector
        self.downloader = VideoDownloader()
        self.demo_downloader = DemoVideoDownloader()
        self.frame_extractor = FrameExtractor(frames_per_second=1)

    async def process_job(self, message: IncomingMessage) -> None:
        """
        Process a video analysis job.

        Args:
            message: The incoming RabbitMQ message.
        """
        async with message.process():
            video_path: Optional[str] = None

            try:
                job = json.loads(message.body.decode())
                analysis_id = job["analysis_id"]
                file_key = job["file_key"]  # YouTube URL
                options = job.get("options", {})

                logger.info(f"Processing video analysis job: {analysis_id}")

                # Update status to downloading
                await self._update_status(analysis_id, "processing", 5, "downloading")

                # Download video
                video_info = await self._download_video(analysis_id, file_key)
                video_path = video_info.file_path

                # Update file info in database
                await self._update_file_info(analysis_id, video_info)

                # Extract frames
                await self._update_status(analysis_id, "processing", 20, "extracting_frames")
                frames = await self._extract_frames(analysis_id, video_path)

                # Analyze frames
                await self._update_status(analysis_id, "processing", 30, "analyzing")
                frame_results = await self._analyze_frames(analysis_id, frames, options)

                # Aggregate results
                await self._update_status(analysis_id, "processing", 90, "aggregating")
                await self._aggregate_and_store_results(
                    analysis_id, video_info, frame_results
                )

                # Mark as completed
                await self._update_status(analysis_id, "completed", 100, None)
                logger.info(f"Completed video analysis: {analysis_id}")

            except DownloadError as e:
                logger.error(f"Download error for job: {e.code} - {e.message}")
                await self._update_status(
                    job.get("analysis_id"),
                    "failed",
                    0,
                    None,
                    error_code=e.code,
                    error_message=e.message,
                )
            except Exception as e:
                logger.error(f"Failed to process video job: {e}", exc_info=True)
                try:
                    await self._update_status(
                        job.get("analysis_id"),
                        "failed",
                        0,
                        None,
                        error_code="PROCESSING_ERROR",
                        error_message=str(e),
                    )
                except Exception:
                    pass
            finally:
                # Cleanup video file
                if video_path:
                    self.downloader.cleanup(video_path)

    async def process_demo_job(self, message: IncomingMessage) -> None:
        """
        Process a demo video analysis job with stricter constraints.

        Demo jobs have:
        - 20 second max duration
        - More aggressive temp file cleanup
        - No webhook notifications

        Args:
            message: The incoming RabbitMQ message.
        """
        async with message.process():
            video_path: Optional[str] = None
            temp_dir: Optional[str] = None

            try:
                job = json.loads(message.body.decode())
                analysis_id = job["analysis_id"]
                file_key = job["file_key"]  # YouTube URL
                options = job.get("options", {})

                logger.info(f"Processing demo video analysis job: {analysis_id}")

                # Create isolated temp directory for demo
                temp_dir = tempfile.mkdtemp(prefix="demo_video_")

                # Update status to downloading
                await self._update_status(analysis_id, "processing", 5, "downloading")

                # Download video with demo constraints (20s max)
                video_info = await self._download_demo_video(analysis_id, file_key, temp_dir)
                video_path = video_info.file_path

                # Update file info in database
                await self._update_file_info(analysis_id, video_info)

                # Extract frames (1 fps, max 20 frames for demo)
                await self._update_status(analysis_id, "processing", 20, "extracting")
                frames = await self._extract_demo_frames(analysis_id, video_path)

                # Analyze frames
                await self._update_status(analysis_id, "processing", 30, "analyzing")
                frame_results = await self._analyze_frames(analysis_id, frames, options)

                # Aggregate results
                await self._update_status(analysis_id, "processing", 90, "complete")
                await self._aggregate_and_store_results(
                    analysis_id, video_info, frame_results
                )

                # Mark as completed
                await self._update_status(analysis_id, "completed", 100, None)
                logger.info(f"Completed demo video analysis: {analysis_id}")

            except DownloadError as e:
                logger.error(f"Demo download error for job: {e.code} - {e.message}")
                await self._update_status(
                    job.get("analysis_id"),
                    "failed",
                    0,
                    None,
                    error_code=e.code,
                    error_message=e.message,
                )
            except Exception as e:
                logger.error(f"Failed to process demo video job: {e}", exc_info=True)
                try:
                    await self._update_status(
                        job.get("analysis_id"),
                        "failed",
                        0,
                        None,
                        error_code="PROCESSING_ERROR",
                        error_message=str(e),
                    )
                except Exception:
                    pass
            finally:
                # Aggressive cleanup for demo - remove entire temp directory
                if temp_dir and os.path.exists(temp_dir):
                    try:
                        shutil.rmtree(temp_dir)
                        logger.info(f"Cleaned up demo temp directory: {temp_dir}")
                    except Exception as e:
                        logger.warning(f"Failed to cleanup demo temp dir {temp_dir}: {e}")

    async def _download_demo_video(
        self, analysis_id: str, youtube_url: str, temp_dir: str
    ) -> VideoInfo:
        """Download video with demo constraints (20s max)."""
        # Create a downloader with demo-specific temp dir
        demo_downloader = DemoVideoDownloader(temp_dir=temp_dir)

        async def progress_callback(progress: int):
            # Map download progress to 5-20% range
            mapped_progress = 5 + int(progress * 0.15)
            await self._update_status(
                analysis_id, "processing", mapped_progress, "downloading"
            )

        return await demo_downloader.download(youtube_url, progress_callback)

    async def _extract_demo_frames(
        self, analysis_id: str, video_path: str
    ) -> List[ExtractedFrame]:
        """Extract frames with demo constraints (max 20 frames)."""
        async def progress_callback(progress: int):
            # Map extraction progress to 20-30% range
            mapped_progress = 20 + int(progress * 0.1)
            await self._update_status(
                analysis_id, "processing", mapped_progress, "extracting"
            )

        return await self.frame_extractor.extract(
            video_path,
            max_frames=DEMO_MAX_FRAMES,
            progress_callback=progress_callback,
        )

    async def _download_video(self, analysis_id: str, youtube_url: str) -> VideoInfo:
        """Download the YouTube video."""
        async def progress_callback(progress: int):
            # Map download progress to 5-20% range
            mapped_progress = 5 + int(progress * 0.15)
            await self._update_status(
                analysis_id, "processing", mapped_progress, "downloading"
            )

        return await self.downloader.download(youtube_url, progress_callback)

    async def _extract_frames(
        self, analysis_id: str, video_path: str
    ) -> List[ExtractedFrame]:
        """Extract frames from the video."""
        async def progress_callback(progress: int):
            # Map extraction progress to 20-30% range
            mapped_progress = 20 + int(progress * 0.1)
            await self._update_status(
                analysis_id, "processing", mapped_progress, "extracting_frames"
            )

        return await self.frame_extractor.extract(
            video_path,
            max_frames=300,
            progress_callback=progress_callback,
        )

    async def _analyze_frames(
        self,
        analysis_id: str,
        frames: List[ExtractedFrame],
        options: dict,
    ) -> List[FrameAnalysisResult]:
        """Analyze each frame for AI-generated content."""
        results: List[FrameAnalysisResult] = []
        total_frames = len(frames)

        for i, frame in enumerate(frames):
            # Convert frame to bytes for detector
            frame_bytes = self.frame_extractor.frame_to_bytes(frame, format="png")

            # Run detection
            detection_result = await self.image_detector.detect(frame_bytes, options)

            # Extract AI probability from result
            ai_probability = self._extract_ai_probability(detection_result)

            results.append(
                FrameAnalysisResult(
                    timestamp=frame.timestamp,
                    ai_probability=ai_probability,
                    verdict=detection_result["verdict"],
                    confidence=detection_result["confidence"],
                )
            )

            # Update progress (30-90% range)
            progress = 30 + int((i / total_frames) * 60)
            await self._update_status(
                analysis_id,
                "processing",
                progress,
                f"analyzing ({i + 1}/{total_frames})",
            )

        return results

    def _extract_ai_probability(self, detection_result: dict) -> float:
        """Extract AI probability from detection result."""
        # Use ensemble score if available
        if detection_result.get("ensemble_score") is not None:
            return detection_result["ensemble_score"]

        # Fall back to confidence with verdict adjustment
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
        analysis_id: str,
        video_info: VideoInfo,
        frame_results: List[FrameAnalysisResult],
    ) -> None:
        """Aggregate frame results and store final analysis."""
        # Calculate average AI probability
        if frame_results:
            avg_ai_prob = sum(r.ai_probability for r in frame_results) / len(frame_results)
            max_ai_prob = max(r.ai_probability for r in frame_results)
        else:
            avg_ai_prob = 0.0
            max_ai_prob = 0.0

        # Find suspicious segments
        suspicious_segments = self._find_suspicious_segments(frame_results)

        # Determine overall verdict
        verdict, confidence, risk_level = self._determine_verdict(
            avg_ai_prob, max_ai_prob, suspicious_segments
        )

        # Build video analysis data
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

        # Generate summary
        summary = self._generate_summary(
            video_info, frame_results, suspicious_segments, verdict
        )

        # Store result
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
                    # Check if this frame is close enough to continue the segment
                    gap = result.timestamp - current_segment_frames[-1].timestamp
                    if gap > self.SEGMENT_GAP_THRESHOLD:
                        # Save current segment and start new one
                        segments.append(self._create_segment(current_segment_frames))
                        current_segment_frames = []
                current_segment_frames.append(result)
            else:
                if current_segment_frames:
                    segments.append(self._create_segment(current_segment_frames))
                    current_segment_frames = []

        # Don't forget the last segment
        if current_segment_frames:
            segments.append(self._create_segment(current_segment_frames))

        return segments

    def _create_segment(
        self, frames: List[FrameAnalysisResult]
    ) -> SuspiciousSegment:
        """Create a suspicious segment from a list of frames."""
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
        """Determine overall verdict based on frame analysis."""
        # Calculate suspicious time ratio
        total_suspicious_time = sum(
            seg.end - seg.start for seg in suspicious_segments
        )

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
        """Generate a human-readable summary of the analysis."""
        total_frames = len(frame_results)
        suspicious_frames = sum(
            1 for r in frame_results if r.ai_probability >= self.SUSPICIOUS_THRESHOLD
        )
        avg_prob = sum(r.ai_probability for r in frame_results) / total_frames if total_frames else 0

        if verdict == "ai_generated":
            summary = f"This video shows strong indicators of AI-generated content. "
        elif verdict == "likely_ai":
            summary = f"This video shows moderate indicators of AI-generated content. "
        elif verdict == "inconclusive":
            summary = f"The analysis was inconclusive. "
        elif verdict == "likely_authentic":
            summary = f"This video appears to be mostly authentic. "
        else:
            summary = f"This video appears to be authentic. "

        summary += f"Analyzed {total_frames} frames over {video_info.duration_seconds:.0f} seconds. "

        if suspicious_frames > 0:
            summary += f"{suspicious_frames} frames ({suspicious_frames/total_frames*100:.0f}%) showed elevated AI probability. "

        if suspicious_segments:
            summary += f"Found {len(suspicious_segments)} suspicious segment(s). "

        return summary.strip()

    async def _update_status(
        self,
        analysis_id: str,
        status: str,
        progress: int,
        stage: Optional[str],
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """Update analysis status in database."""
        await self.db.execute(
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

    async def _update_file_info(self, analysis_id: str, video_info: VideoInfo) -> None:
        """Update file information in database."""
        await self.db.execute(
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
        analysis_id: str,
        verdict: str,
        confidence: float,
        risk_level: str,
        summary: str,
        video_analysis: dict,
    ) -> None:
        """Store analysis result in database."""
        # Build detections list (simplified for video)
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

        await self.db.execute(
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
