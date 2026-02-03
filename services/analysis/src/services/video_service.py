"""Video analysis service for YouTube URL processing."""

import logging
import re
from typing import Optional
from urllib.parse import parse_qs, urlparse

logger = logging.getLogger(__name__)


class VideoValidationError(Exception):
    """Raised when video validation fails."""

    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


class VideoService:
    """Service for video-related operations."""

    # YouTube URL patterns
    YOUTUBE_PATTERNS = [
        r"(?:https?://)?(?:www\.)?youtube\.com/watch\?v=([\w-]+)",
        r"(?:https?://)?(?:www\.)?youtu\.be/([\w-]+)",
        r"(?:https?://)?(?:www\.)?youtube\.com/shorts/([\w-]+)",
        r"(?:https?://)?(?:www\.)?youtube\.com/embed/([\w-]+)",
    ]

    # Limits
    MAX_DURATION_SECONDS = 300  # 5 minutes
    DEMO_MAX_DURATION_SECONDS = 20  # 20 seconds for demo
    MAX_FILE_SIZE_MB = 500
    MAX_RESOLUTION = 720  # 720p

    def validate_youtube_url(self, url: str) -> str:
        """
        Validate a YouTube URL and extract the video ID.

        Args:
            url: The YouTube URL to validate.

        Returns:
            The extracted YouTube video ID.

        Raises:
            VideoValidationError: If the URL is invalid.
        """
        if not url:
            raise VideoValidationError(
                code="INVALID_URL",
                message="Please enter a valid YouTube URL",
            )

        # Clean the URL
        url = url.strip()

        # Try each pattern
        for pattern in self.YOUTUBE_PATTERNS:
            match = re.match(pattern, url)
            if match:
                video_id = match.group(1)
                if self._is_valid_video_id(video_id):
                    return video_id

        # Try parsing as query parameter (handles variations)
        parsed = urlparse(url)
        if "youtube.com" in parsed.netloc or "youtu.be" in parsed.netloc:
            # Check for v= parameter
            query_params = parse_qs(parsed.query)
            if "v" in query_params:
                video_id = query_params["v"][0]
                if self._is_valid_video_id(video_id):
                    return video_id

        raise VideoValidationError(
            code="INVALID_URL",
            message="Please enter a valid YouTube URL",
        )

    def _is_valid_video_id(self, video_id: str) -> bool:
        """Check if a video ID has valid format."""
        # YouTube video IDs are 11 characters, alphanumeric with - and _
        if not video_id:
            return False
        if len(video_id) != 11:
            return False
        return bool(re.match(r"^[\w-]+$", video_id))

    def get_youtube_url_from_id(self, video_id: str) -> str:
        """Construct a standard YouTube URL from a video ID."""
        return f"https://www.youtube.com/watch?v={video_id}"

    def get_download_options(self, demo: bool = False) -> dict:
        """Get yt-dlp download options for safe downloading."""
        return {
            "format": f"best[height<={self.MAX_RESOLUTION}][filesize<{self.MAX_FILE_SIZE_MB}M]/best[height<={self.MAX_RESOLUTION}]",
            "max_filesize": self.MAX_FILE_SIZE_MB * 1024 * 1024,
            "socket_timeout": 30,
            "retries": 3,
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
        }

    def validate_duration(self, duration_seconds: float, demo: bool = False) -> None:
        """
        Validate video duration against limits.

        Args:
            duration_seconds: The video duration in seconds.
            demo: Whether this is a demo analysis (stricter limits).

        Raises:
            VideoValidationError: If duration exceeds the limit.
        """
        max_duration = self.DEMO_MAX_DURATION_SECONDS if demo else self.MAX_DURATION_SECONDS

        if duration_seconds > max_duration:
            if demo:
                raise VideoValidationError(
                    code="VIDEO_TOO_LONG",
                    message=f"Video must be {max_duration} seconds or less",
                )
            else:
                raise VideoValidationError(
                    code="VIDEO_TOO_LONG",
                    message=f"Video exceeds maximum duration of {max_duration // 60} minutes",
                )


# Singleton instance
video_service = VideoService()
