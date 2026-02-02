from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Environment
    environment: str = "development"
    port: str = "8080"

    # Database
    database_url: str = "postgres://forensivision:forensivision_dev@localhost:5432/forensivision"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # RabbitMQ
    rabbitmq_url: str = "amqp://forensivision:forensivision_dev@localhost:5672/"

    # S3/MinIO
    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "forensivision"
    s3_secret_key: str = "forensivision_dev"
    s3_bucket_uploads: str = "forensivision-uploads"
    s3_bucket_results: str = "forensivision-results"

    # Auth service
    auth_service_url: str = "http://localhost:8081"

    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:8080"]

    # Queue names
    queue_image_analysis: str = "analysis.image"
    queue_video_analysis: str = "analysis.video"
    queue_audio_analysis: str = "analysis.audio"
    queue_batch_analysis: str = "analysis.batch"

    # File limits
    max_image_size_mb: int = 50
    max_video_size_mb: int = 500

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
