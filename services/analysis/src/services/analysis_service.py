import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from src.core.config import settings
from src.core.database import get_db
from src.core.rabbitmq import publish_message
from src.core.redis import get_redis
from src.models.analysis import (
    AnalysisDB,
    AnalysisResult,
    AnalysisStatus,
    AnalysisType,
    BatchAnalysisResponse,
    BatchProgress,
    FileInfo,
)

logger = logging.getLogger(__name__)


class AnalysisService:
    """Service for managing analysis jobs."""

    async def create_image_analysis(
        self,
        user_id: UUID,
        organization_id: Optional[UUID],
        source: Dict[str, Any],
        options: Optional[Dict[str, Any]] = None,
        webhook_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
    ) -> AnalysisDB:
        """Create a new image analysis job."""
        # Check idempotency
        if idempotency_key:
            existing = await self._get_by_idempotency_key(idempotency_key)
            if existing:
                return existing

        analysis_id = uuid4()
        now = datetime.utcnow()

        # Determine file key based on source type
        file_key = None
        if source.get("type") == "url":
            file_key = source.get("url")
        elif source.get("type") == "upload":
            file_key = source.get("upload_id")

        # Insert into database
        db = await get_db()
        row = await db.fetchrow(
            """
            INSERT INTO analyses (
                id, user_id, organization_id, type, status, priority,
                file_key, options, webhook_url, external_id, idempotency_key,
                metadata, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
            """,
            analysis_id,
            user_id,
            organization_id,
            AnalysisType.IMAGE.value,
            AnalysisStatus.PENDING.value,
            options.get("priority", 5) if options else 5,
            file_key,
            json.dumps(options or {}),
            webhook_url,
            metadata.get("external_id") if metadata else None,
            idempotency_key,
            json.dumps(metadata or {}),
            now,
            now,
        )

        analysis = self._row_to_analysis(row)

        # Publish to queue
        await self._publish_analysis_job(analysis)

        return analysis

    async def create_video_analysis(
        self,
        user_id: UUID,
        organization_id: Optional[UUID],
        source: Dict[str, Any],
        options: Optional[Dict[str, Any]] = None,
        webhook_url: Optional[str] = None,
        priority: str = "normal",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AnalysisDB:
        """Create a new video analysis job."""
        analysis_id = uuid4()
        now = datetime.utcnow()

        priority_value = {"low": 3, "normal": 5, "high": 8, "critical": 10}.get(priority, 5)

        file_key = None
        if source.get("type") == "url":
            file_key = source.get("url")
        elif source.get("type") == "upload":
            file_key = source.get("upload_id")

        db = await get_db()
        row = await db.fetchrow(
            """
            INSERT INTO analyses (
                id, user_id, organization_id, type, status, priority,
                file_key, options, webhook_url, external_id,
                metadata, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
            """,
            analysis_id,
            user_id,
            organization_id,
            AnalysisType.VIDEO.value,
            AnalysisStatus.PENDING.value,
            priority_value,
            file_key,
            json.dumps(options or {}),
            webhook_url,
            metadata.get("external_id") if metadata else None,
            json.dumps(metadata or {}),
            now,
            now,
        )

        analysis = self._row_to_analysis(row)

        # Publish to video queue
        await self._publish_analysis_job(analysis, settings.queue_video_analysis)

        return analysis

    async def create_batch_analysis(
        self,
        user_id: UUID,
        organization_id: Optional[UUID],
        items: List[Dict[str, Any]],
        options: Optional[Dict[str, Any]] = None,
        webhook_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> BatchAnalysisResponse:
        """Create a batch analysis job."""
        batch_id = uuid4()
        now = datetime.utcnow()

        db = await get_db()

        # Create batch record
        await db.execute(
            """
            INSERT INTO batch_analyses (
                id, user_id, organization_id, status, total_items,
                options, webhook_url, external_id, metadata, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """,
            batch_id,
            user_id,
            organization_id,
            AnalysisStatus.PENDING.value,
            len(items),
            json.dumps(options or {}),
            webhook_url,
            metadata.get("external_id") if metadata else None,
            json.dumps(metadata or {}),
            now,
            now,
        )

        # Create batch items
        for idx, item in enumerate(items):
            item_id = uuid4()
            await db.execute(
                """
                INSERT INTO batch_items (id, batch_id, item_index, external_id, status, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                item_id,
                batch_id,
                idx,
                item.get("id"),
                AnalysisStatus.PENDING.value,
                now,
                now,
            )

        # Publish batch job to queue
        message = json.dumps(
            {
                "batch_id": str(batch_id),
                "user_id": str(user_id),
                "organization_id": str(organization_id) if organization_id else None,
                "items": items,
                "options": options,
            }
        )
        await publish_message(settings.queue_batch_analysis, message.encode(), priority=5)

        return BatchAnalysisResponse(
            id=batch_id,
            status=AnalysisStatus.PENDING,
            progress=BatchProgress(
                total=len(items),
                completed=0,
                failed=0,
                processing=0,
                pending=len(items),
            ),
            created_at=now,
        )

    async def get_analysis(self, analysis_id: UUID, user_id: UUID) -> Optional[AnalysisDB]:
        """Get an analysis by ID."""
        db = await get_db()
        row = await db.fetchrow(
            """
            SELECT * FROM analyses WHERE id = $1 AND user_id = $2
            """,
            analysis_id,
            user_id,
        )

        if not row:
            return None

        return self._row_to_analysis(row)

    async def get_analysis_result(self, analysis_id: UUID) -> Optional[AnalysisResult]:
        """Get analysis results."""
        db = await get_db()
        row = await db.fetchrow(
            """
            SELECT * FROM analysis_results WHERE analysis_id = $1
            """,
            analysis_id,
        )

        if not row:
            return None

        # Parse video_analysis if present
        video_analysis = None
        if row.get("video_analysis"):
            video_analysis = json.loads(row["video_analysis"]) if isinstance(row["video_analysis"], str) else row["video_analysis"]

        return AnalysisResult(
            verdict=row["verdict"],
            confidence=float(row["confidence"]),
            risk_level=row["risk_level"],
            summary=row["summary"],
            detections=json.loads(row["detections"]) if row["detections"] else [],
            ensemble_score=float(row["ensemble_score"]) if row["ensemble_score"] else None,
            heatmap_url=row["heatmap_url"],
            video_analysis=video_analysis,
        )

    async def list_analyses(
        self,
        user_id: UUID,
        limit: int = 20,
        cursor: Optional[str] = None,
        status: Optional[AnalysisStatus] = None,
        analysis_type: Optional[AnalysisType] = None,
    ) -> List[AnalysisDB]:
        """List analyses for a user with pagination."""
        db = await get_db()

        query = "SELECT * FROM analyses WHERE user_id = $1"
        params: List[Any] = [user_id]
        param_idx = 2

        if status:
            query += f" AND status = ${param_idx}"
            params.append(status.value)
            param_idx += 1

        if analysis_type:
            query += f" AND type = ${param_idx}"
            params.append(analysis_type.value)
            param_idx += 1

        if cursor:
            # Decode cursor (base64 encoded id)
            import base64

            cursor_id = UUID(base64.b64decode(cursor).decode())
            query += f" AND id < ${param_idx}"
            params.append(cursor_id)
            param_idx += 1

        query += f" ORDER BY created_at DESC LIMIT ${param_idx}"
        params.append(limit)

        rows = await db.fetch(query, *params)
        return [self._row_to_analysis(row) for row in rows]

    async def cancel_analysis(self, analysis_id: UUID, user_id: UUID) -> bool:
        """Cancel a pending or processing analysis."""
        db = await get_db()
        result = await db.execute(
            """
            UPDATE analyses
            SET status = $3, updated_at = $4
            WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'processing')
            """,
            analysis_id,
            user_id,
            AnalysisStatus.CANCELLED.value,
            datetime.utcnow(),
        )

        return "UPDATE 1" in result

    async def update_progress(
        self,
        analysis_id: UUID,
        progress: int,
        current_stage: Optional[str] = None,
    ) -> None:
        """Update analysis progress (called by workers)."""
        db = await get_db()
        await db.execute(
            """
            UPDATE analyses
            SET progress = $2, current_stage = $3, updated_at = $4
            WHERE id = $1
            """,
            analysis_id,
            progress,
            current_stage,
            datetime.utcnow(),
        )

        # Also cache in Redis for fast access
        redis = await get_redis()
        await redis.hset(
            f"analysis:{analysis_id}:progress",
            mapping={"progress": progress, "stage": current_stage or ""},
        )
        await redis.expire(f"analysis:{analysis_id}:progress", 3600)

    async def _get_by_idempotency_key(self, key: str) -> Optional[AnalysisDB]:
        """Get analysis by idempotency key."""
        db = await get_db()
        row = await db.fetchrow(
            "SELECT * FROM analyses WHERE idempotency_key = $1",
            key,
        )
        if row:
            return self._row_to_analysis(row)
        return None

    async def _publish_analysis_job(
        self,
        analysis: AnalysisDB,
        queue: Optional[str] = None,
    ) -> None:
        """Publish analysis job to message queue."""
        if queue is None:
            queue = settings.queue_image_analysis

        message = json.dumps(
            {
                "analysis_id": str(analysis.id),
                "user_id": str(analysis.user_id),
                "organization_id": str(analysis.organization_id) if analysis.organization_id else None,
                "type": analysis.type.value,
                "file_key": analysis.file_key,
                "options": analysis.options,
            }
        )

        await publish_message(queue, message.encode(), priority=analysis.priority)
        logger.info(f"Published analysis job {analysis.id} to {queue}")

    def _row_to_analysis(self, row) -> AnalysisDB:
        """Convert database row to AnalysisDB model."""
        return AnalysisDB(
            id=row["id"],
            user_id=row["user_id"],
            organization_id=row["organization_id"],
            type=AnalysisType(row["type"]),
            status=AnalysisStatus(row["status"]),
            priority=row["priority"],
            file_key=row["file_key"],
            file_name=row["file_name"],
            file_size_bytes=row["file_size_bytes"],
            file_mime_type=row["file_mime_type"],
            file_hash=row["file_hash"],
            duration_seconds=float(row["duration_seconds"]) if row["duration_seconds"] else None,
            resolution=row["resolution"],
            fps=float(row["fps"]) if row["fps"] else None,
            progress=row["progress"] or 0,
            current_stage=row["current_stage"],
            processing_started_at=row["processing_started_at"],
            processing_completed_at=row["processing_completed_at"],
            processing_time_ms=row["processing_time_ms"],
            options=json.loads(row["options"]) if row["options"] else {},
            webhook_url=row["webhook_url"],
            external_id=row["external_id"],
            idempotency_key=row["idempotency_key"],
            metadata=json.loads(row["metadata"]) if row["metadata"] else {},
            error_code=row["error_code"],
            error_message=row["error_message"],
            retry_count=row["retry_count"] or 0,
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )


# Singleton instance
analysis_service = AnalysisService()
