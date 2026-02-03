"""Video processing modules."""

from src.video.downloader import VideoDownloader, VideoInfo, DownloadError
from src.video.frame_extractor import FrameExtractor, ExtractedFrame

__all__ = [
    "VideoDownloader",
    "VideoInfo",
    "DownloadError",
    "FrameExtractor",
    "ExtractedFrame",
]
