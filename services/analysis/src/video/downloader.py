"""YouTube video downloader using yt-dlp."""

import asyncio
import logging
import os
import tempfile
from dataclasses import dataclass
from typing import Optional, Callable

logger = logging.getLogger(__name__)


class DownloadError(Exception):
    """Raised when video download fails."""

    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


@dataclass
class VideoInfo:
    """Information about a downloaded video."""

    video_id: str
    title: str
    duration_seconds: float
    file_path: str
    file_size_bytes: int
    resolution: str
    fps: float


class VideoDownloader:
    """Downloads YouTube videos using yt-dlp."""

    # Limits
    MAX_DURATION_SECONDS = 300  # 5 minutes
    MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024  # 500MB
    MAX_RESOLUTION = 720  # 720p

    def __init__(self, temp_dir: Optional[str] = None, max_duration: Optional[int] = None):
        """
        Initialize the downloader.

        Args:
            temp_dir: Directory for temporary video files. Defaults to system temp.
            max_duration: Maximum video duration in seconds.
        """
        self.temp_dir = temp_dir or tempfile.gettempdir()
        if max_duration is not None:
            self.MAX_DURATION_SECONDS = max_duration

    async def download(
        self,
        youtube_url: str,
        progress_callback: Optional[Callable] = None,
    ) -> VideoInfo:
        """
        Download a YouTube video.

        Args:
            youtube_url: The YouTube URL to download.
            progress_callback: Optional callback for progress updates.

        Returns:
            VideoInfo with details about the downloaded video.

        Raises:
            DownloadError: If download fails.
        """
        import yt_dlp

        # First, get video info to check duration
        info = await self._get_video_info(youtube_url)

        # Check duration limit
        duration = info.get("duration", 0)
        if duration > self.MAX_DURATION_SECONDS:
            if self.MAX_DURATION_SECONDS < 60:
                limit_str = f"{self.MAX_DURATION_SECONDS} second"
            else:
                limit_str = f"{self.MAX_DURATION_SECONDS // 60} minute"
            raise DownloadError(
                code="VIDEO_TOO_LONG",
                message=f"Video exceeds {limit_str} limit",
            )

        # Generate output path
        video_id = info.get("id", "unknown")
        output_path = os.path.join(self.temp_dir, f"{video_id}.mp4")

        # Download the video
        try:
            await self._download_video(youtube_url, output_path, progress_callback)
        except Exception as e:
            logger.error(f"Download failed: {e}")
            raise DownloadError(
                code="DOWNLOAD_FAILED",
                message="Failed to download. Please try again",
            )

        # Verify file exists and check size
        if not os.path.exists(output_path):
            raise DownloadError(
                code="DOWNLOAD_FAILED",
                message="Failed to download. Please try again",
            )

        file_size = os.path.getsize(output_path)
        if file_size > self.MAX_FILE_SIZE_BYTES:
            os.remove(output_path)
            raise DownloadError(
                code="FILE_TOO_LARGE",
                message=f"Video file exceeds {self.MAX_FILE_SIZE_BYTES // (1024*1024)}MB limit",
            )

        # Extract resolution and fps
        resolution = f"{info.get('height', 720)}p"
        fps = info.get("fps", 30) or 30

        return VideoInfo(
            video_id=video_id,
            title=info.get("title", "Unknown"),
            duration_seconds=duration,
            file_path=output_path,
            file_size_bytes=file_size,
            resolution=resolution,
            fps=fps,
        )

    async def _get_video_info(self, url: str) -> dict:
        """Get video info without downloading."""
        import yt_dlp

        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
        }

        def _extract():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)

        loop = asyncio.get_event_loop()
        try:
            info = await loop.run_in_executor(None, _extract)
        except Exception as e:
            error_msg = str(e).lower()
            if "private" in error_msg or "unavailable" in error_msg:
                raise DownloadError(
                    code="VIDEO_UNAVAILABLE",
                    message="This video is unavailable or private",
                )
            raise DownloadError(
                code="VIDEO_UNAVAILABLE",
                message="This video is unavailable or private",
            )

        if not info:
            raise DownloadError(
                code="VIDEO_UNAVAILABLE",
                message="This video is unavailable or private",
            )

        return info

    async def _download_video(
        self,
        url: str,
        output_path: str,
        progress_callback: Optional[Callable] = None,
    ) -> None:
        """Download video to the specified path."""
        import yt_dlp

        progress_hook = None
        if progress_callback:
            def progress_hook(d):
                if d["status"] == "downloading":
                    total = d.get("total_bytes") or d.get("total_bytes_estimate", 0)
                    downloaded = d.get("downloaded_bytes", 0)
                    if total > 0:
                        progress = int((downloaded / total) * 100)
                        try:
                            loop = asyncio.get_event_loop()
                            if loop.is_running():
                                asyncio.create_task(progress_callback(progress))
                        except Exception:
                            pass

        ydl_opts = {
            "format": f"best[height<={self.MAX_RESOLUTION}][ext=mp4]/best[height<={self.MAX_RESOLUTION}]/best[ext=mp4]/best",
            "outtmpl": output_path,
            "quiet": True,
            "no_warnings": True,
            "socket_timeout": 30,
            "retries": 3,
            "progress_hooks": [progress_hook] if progress_hook else [],
        }

        def _download():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _download)

    def cleanup(self, file_path: str) -> None:
        """Remove a downloaded video file."""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Cleaned up video file: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to cleanup {file_path}: {e}")
