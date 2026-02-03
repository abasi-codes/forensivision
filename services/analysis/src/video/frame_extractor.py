"""Frame extraction from videos using OpenCV."""

import asyncio
import io
import logging
import os
from dataclasses import dataclass
from typing import List, Optional, Callable

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

    MAX_FRAMES = 300
    DEFAULT_FPS = 1

    def __init__(self, frames_per_second: float = DEFAULT_FPS):
        self.frames_per_second = frames_per_second

    async def extract(
        self,
        video_path: str,
        max_frames: Optional[int] = None,
        progress_callback: Optional[Callable] = None,
    ) -> List[ExtractedFrame]:
        """Extract frames from a video file."""
        max_frames = max_frames or self.MAX_FRAMES

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
        progress_callback: Optional[Callable],
    ) -> List[ExtractedFrame]:
        """Synchronous frame extraction."""
        if not os.path.exists(video_path):
            raise ValueError(f"Video file not found: {video_path}")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")

        try:
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            video_fps = cap.get(cv2.CAP_PROP_FPS) or 30
            duration = total_frames / video_fps if video_fps > 0 else 0

            logger.info(
                f"Video: {total_frames} frames, {video_fps:.1f} fps, {duration:.1f}s duration"
            )

            frame_interval = int(video_fps / self.frames_per_second)
            if frame_interval < 1:
                frame_interval = 1

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

                    if extracted_count >= max_frames:
                        break

                frame_number += 1

            logger.info(f"Extracted {len(frames)} frames from video")
            return frames

        finally:
            cap.release()

    def frame_to_bytes(
        self,
        frame: ExtractedFrame,
        format: str = "png",
        quality: int = 95,
    ) -> bytes:
        """Convert a frame to bytes."""
        if format.lower() == "png":
            _, buffer = cv2.imencode(".png", frame.image)
        else:
            _, buffer = cv2.imencode(
                ".jpg",
                frame.image,
                [cv2.IMWRITE_JPEG_QUALITY, quality],
            )
        return buffer.tobytes()
