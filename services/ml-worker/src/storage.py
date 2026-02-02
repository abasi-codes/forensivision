import io
import logging
from typing import Optional

import boto3
from botocore.config import Config as BotoConfig

from src.config import settings

logger = logging.getLogger(__name__)


class S3Storage:
    """S3-compatible storage client."""

    def __init__(self):
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            config=BotoConfig(signature_version="s3v4"),
            region_name="us-east-1",
        )

    async def download(self, bucket: str, key: str) -> bytes:
        """Download a file from S3."""
        try:
            response = self.client.get_object(Bucket=bucket, Key=key)
            return response["Body"].read()
        except Exception as e:
            logger.error(f"Failed to download {bucket}/{key}: {e}")
            raise

    async def upload(
        self,
        bucket: str,
        key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload a file to S3."""
        try:
            self.client.put_object(
                Bucket=bucket,
                Key=key,
                Body=io.BytesIO(data),
                ContentType=content_type,
            )
            return f"s3://{bucket}/{key}"
        except Exception as e:
            logger.error(f"Failed to upload to {bucket}/{key}: {e}")
            raise

    async def delete(self, bucket: str, key: str) -> None:
        """Delete a file from S3."""
        try:
            self.client.delete_object(Bucket=bucket, Key=key)
        except Exception as e:
            logger.error(f"Failed to delete {bucket}/{key}: {e}")
            raise
