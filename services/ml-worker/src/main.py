import asyncio
import json
import logging
import signal
from datetime import datetime
from typing import Optional

import aio_pika
from aio_pika import IncomingMessage

from src.config import settings
from src.detectors.image_detector import ImageDetector
from src.storage import S3Storage
from src.database import Database
from src.workers.video_worker import VideoWorker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class MLWorker:
    """Main ML worker that processes analysis jobs from queues."""

    def __init__(self):
        self.connection: Optional[aio_pika.Connection] = None
        self.channel: Optional[aio_pika.Channel] = None
        self.image_detector: Optional[ImageDetector] = None
        self.video_worker: Optional[VideoWorker] = None
        self.storage: Optional[S3Storage] = None
        self.db: Optional[Database] = None
        self.running = True

    async def start(self):
        """Start the worker."""
        logger.info(f"Starting ML Worker {settings.worker_id}...")

        # Initialize components
        self.storage = S3Storage()
        self.db = Database()
        await self.db.connect()

        # Initialize detectors
        self.image_detector = ImageDetector()

        # Initialize video worker
        self.video_worker = VideoWorker(self.db, self.image_detector)

        # Connect to RabbitMQ
        self.connection = await aio_pika.connect_robust(settings.rabbitmq_url)
        self.channel = await self.connection.channel()
        await self.channel.set_qos(prefetch_count=settings.prefetch_count)

        # Start consuming from queues
        await self._consume_queue(settings.queue_image_analysis, self._process_image_job)
        await self._consume_queue(settings.queue_video_analysis, self._process_video_job)
        await self._consume_queue(settings.queue_video_demo, self._process_demo_video_job)

        logger.info(f"ML Worker {settings.worker_id} started successfully")

        # Keep running until shutdown signal
        while self.running:
            await asyncio.sleep(1)

    async def stop(self):
        """Gracefully stop the worker."""
        logger.info("Shutting down ML Worker...")
        self.running = False

        if self.channel:
            await self.channel.close()
        if self.connection:
            await self.connection.close()
        if self.db:
            await self.db.disconnect()

        logger.info("ML Worker shutdown complete")

    async def _consume_queue(self, queue_name: str, handler):
        """Start consuming messages from a queue."""
        queue = await self.channel.declare_queue(queue_name, durable=True)
        await queue.consume(handler)
        logger.info(f"Consuming from queue: {queue_name}")

    async def _process_image_job(self, message: IncomingMessage):
        """Process an image analysis job."""
        async with message.process():
            try:
                job = json.loads(message.body.decode())
                analysis_id = job["analysis_id"]
                file_key = job["file_key"]
                options = job.get("options", {})

                logger.info(f"Processing image analysis job: {analysis_id}")

                # Update status to processing
                await self._update_status(analysis_id, "processing", 0, "downloading")

                # Download image from S3
                image_data = await self.storage.download(
                    settings.s3_bucket_uploads, file_key
                )

                await self._update_status(analysis_id, "processing", 20, "preprocessing")

                # Run detection
                await self._update_status(analysis_id, "processing", 40, "detecting")
                result = await self.image_detector.detect(image_data, options)

                # Generate heatmap if requested
                heatmap_url = None
                if options.get("include_heatmap"):
                    await self._update_status(analysis_id, "processing", 80, "generating_heatmap")
                    heatmap_data = await self.image_detector.generate_heatmap(
                        image_data, result
                    )
                    if heatmap_data:
                        heatmap_key = f"heatmaps/{analysis_id}.png"
                        await self.storage.upload(
                            settings.s3_bucket_results,
                            heatmap_key,
                            heatmap_data,
                            "image/png",
                        )
                        heatmap_url = f"{settings.s3_endpoint}/{settings.s3_bucket_results}/{heatmap_key}"

                # Store results
                await self._update_status(analysis_id, "processing", 90, "storing_results")
                await self._store_result(analysis_id, result, heatmap_url)

                # Mark as completed
                await self._update_status(analysis_id, "completed", 100, None)
                logger.info(f"Completed image analysis: {analysis_id}")

            except Exception as e:
                logger.error(f"Failed to process image job: {e}", exc_info=True)
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

    async def _process_video_job(self, message: IncomingMessage):
        """Process a video analysis job."""
        await self.video_worker.process_job(message)

    async def _process_demo_video_job(self, message: IncomingMessage):
        """Process a demo video analysis job with stricter constraints."""
        await self.video_worker.process_demo_job(message)

    async def _update_status(
        self,
        analysis_id: str,
        status: str,
        progress: int,
        stage: Optional[str],
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
    ):
        """Update analysis status in database."""
        await self.db.execute(
            """
            UPDATE analyses
            SET status = $2, progress = $3, current_stage = $4,
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

    async def _store_result(self, analysis_id: str, result: dict, heatmap_url: Optional[str]):
        """Store analysis result in database."""
        await self.db.execute(
            """
            INSERT INTO analysis_results (
                id, analysis_id, verdict, confidence, risk_level, summary,
                detections, ensemble_score, heatmap_url, created_at
            ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW()
            )
            """,
            analysis_id,
            result["verdict"],
            result["confidence"],
            result["risk_level"],
            result["summary"],
            json.dumps(result["detections"]),
            result.get("ensemble_score"),
            heatmap_url,
        )


async def main():
    """Main entry point."""
    worker = MLWorker()

    # Setup signal handlers
    loop = asyncio.get_event_loop()

    def shutdown_handler():
        asyncio.create_task(worker.stop())

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, shutdown_handler)

    await worker.start()


if __name__ == "__main__":
    asyncio.run(main())
