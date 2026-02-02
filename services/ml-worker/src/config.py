from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """ML Worker configuration."""

    # RabbitMQ
    rabbitmq_url: str = "amqp://forensivision:forensivision_dev@localhost:5672/"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Database
    database_url: str = "postgres://forensivision:forensivision_dev@localhost:5432/forensivision"

    # S3/MinIO
    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "forensivision"
    s3_secret_key: str = "forensivision_dev"
    s3_bucket_uploads: str = "forensivision-uploads"
    s3_bucket_results: str = "forensivision-results"

    # Worker settings
    worker_id: str = "worker-1"
    worker_concurrency: int = 2
    prefetch_count: int = 1

    # Queue names
    queue_image_analysis: str = "analysis.image"
    queue_video_analysis: str = "analysis.video"
    queue_audio_analysis: str = "analysis.audio"

    # Model paths
    model_dir: str = "/app/models"

    # Processing settings
    image_max_dimension: int = 1024
    batch_size: int = 8

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
