"""Frame extraction from videos using OpenCV."""

import asyncio
import logging
import os
from dataclasses import dataclass
from typing import List, Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class ExtractedFrame:
    """A single extracted frame."""

    timestamp: float  # Seconds into video
    frame_number: int
    image: np.ndarray  # BGR image array


class FrameExtractor:
    """Extracts frames from video files using OpenCV."""

    # Limits
    MAX_FRAMES = 300  # Maximum frames to extract
    DEFAULT_FPS = 1  # Extract 1 frame per second by default

    def __init__(self, frames_per_second: float = DEFAULT_FPS):
        """
        Initialize the frame extractor.

        Args:
            frames_per_second: Number of frames to extract per second of video.
        """
        self.frames_per_second = frames_per_second

    async def extract(
        self,
        video_path: str,
        max_frames: Optional[int] = None,
        progress_callback: Optional[callable] = None,
    ) -> List[ExtractedFrame]:
        """
        Extract frames from a video file.

        Args:
            video_path: Path to the video file.
            max_frames: Maximum number of frames to extract.
            progress_callback: Optional callback for progress updates.

        Returns:
            List of ExtractedFrame objects.

        Raises:
            ValueError: If the video cannot be opened or has no frames.
        """
        max_frames = max_frames or self.MAX_FRAMES

        # Run extraction in executor to avoid blocking
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self._extract_sync,
            video_path,
            max_frames,
            progress_callback,
        )

    def _extract_sync(
        self,
        video_path: str,
        max_frames: int,
        progress_callback: Optional[callable],
    ) -> List[ExtractedFrame]:
        """Synchronous frame extraction."""
        if not os.path.exists(video_path):
            raise ValueError(f"Video file not found: {video_path}")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")

        try:
            # Get video properties
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            video_fps = cap.get(cv2.CAP_PROP_FPS) or 30
            duration = total_frames / video_fps if video_fps > 0 else 0

            logger.info(
                f"Video: {total_frames} frames, {video_fps:.1f} fps, {duration:.1f}s duration"
            )

            # Calculate frame interval
            # Extract frames_per_second frames per second of video
            frame_interval = int(video_fps / self.frames_per_second)
            if frame_interval < 1:
                frame_interval = 1

            # Calculate total frames to extract
            frames_to_extract = min(
                int(duration * self.frames_per_second),
                max_frames,
            )

            frames: List[ExtractedFrame] = []
            frame_number = 0
            extracted_count = 0

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # Check if we should extract this frame
                if frame_number % frame_interval == 0:
                    timestamp = frame_number / video_fps

                    frames.append(
                        ExtractedFrame(
                            timestamp=timestamp,
                            frame_number=frame_number,
                            image=frame.copy(),
                        )
                    )
                    extracted_count += 1

                    # Report progress
                    if progress_callback and frames_to_extract > 0:
                        progress = int((extracted_count / frames_to_extract) * 100)
                        try:
                            # Try to call callback (may be sync or async)
                            result = progress_callback(progress)
                            if asyncio.iscoroutine(result):
                                # Can't await here, just ignore
                                pass
                        except Exception:
                            pass

                    # Check if we've extracted enough frames
                    if extracted_count >= max_frames:
                        break

                frame_number += 1

            logger.info(f"Extracted {len(frames)} frames from video")
            return frames

        finally:
            cap.release()

    def get_frame_timestamps(self, frames: List[ExtractedFrame]) -> List[float]:
        """Get list of timestamps for all extracted frames."""
        return [frame.timestamp for frame in frames]

    def get_frame_at_timestamp(
        self,
        frames: List[ExtractedFrame],
        timestamp: float,
    ) -> Optional[ExtractedFrame]:
        """Find the frame closest to the given timestamp."""
        if not frames:
            return None

        closest = min(frames, key=lambda f: abs(f.timestamp - timestamp))
        return closest

    def frame_to_rgb(self, frame: ExtractedFrame) -> np.ndarray:
        """Convert a frame from BGR to RGB format."""
        return cv2.cvtColor(frame.image, cv2.COLOR_BGR2RGB)

    def frame_to_bytes(
        self,
        frame: ExtractedFrame,
        format: str = "png",
        quality: int = 95,
    ) -> bytes:
        """
        Convert a frame to bytes in the specified format.

        Args:
            frame: The frame to convert.
            format: Output format ('png' or 'jpg').
            quality: JPEG quality (1-100), ignored for PNG.

        Returns:
            Image data as bytes.
        """
        if format.lower() == "png":
            _, buffer = cv2.imencode(".png", frame.image)
        else:
            _, buffer = cv2.imencode(
                ".jpg",
                frame.image,
                [cv2.IMWRITE_JPEG_QUALITY, quality],
            )
        return buffer.tobytes()

    def resize_frame(
        self,
        frame: ExtractedFrame,
        max_dimension: int = 1024,
    ) -> ExtractedFrame:
        """
        Resize a frame to fit within max_dimension while maintaining aspect ratio.

        Args:
            frame: The frame to resize.
            max_dimension: Maximum width or height.

        Returns:
            A new ExtractedFrame with resized image.
        """
        height, width = frame.image.shape[:2]

        if max(height, width) <= max_dimension:
            return frame

        scale = max_dimension / max(height, width)
        new_width = int(width * scale)
        new_height = int(height * scale)

        resized = cv2.resize(
            frame.image,
            (new_width, new_height),
            interpolation=cv2.INTER_AREA,
        )

        return ExtractedFrame(
            timestamp=frame.timestamp,
            frame_number=frame.frame_number,
            image=resized,
        )
