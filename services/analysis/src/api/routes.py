from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from src.api.auth import get_current_user, UserContext
from src.api.rate_limit import check_demo_rate_limit, get_client_ip
from src.models.analysis import (
    AnalysisResponse,
    AnalysisStatus,
    AnalysisType,
    BatchAnalysisRequest,
    BatchAnalysisResponse,
    DemoVideoAnalysisRequest,
    FileInfo,
    ImageAnalysisRequest,
    VideoAnalysisRequest,
)
from src.services.analysis_service import analysis_service, DEMO_USER_ID
from src.services.video_service import video_service, VideoValidationError

router = APIRouter()


@router.post("/analyze/image", response_model=dict, status_code=status.HTTP_202_ACCEPTED)
async def analyze_image(
    request: ImageAnalysisRequest,
    user: UserContext = Depends(get_current_user),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    """
    Analyze an image for AI-generated content.

    Supports multiple source types:
    - URL: Provide a publicly accessible image URL
    - Upload: Provide an upload_id from a previous upload request

    Returns immediately with a job ID. Use GET /v1/analysis/{id} to check status
    or configure a webhook for notifications.
    """
    webhook_url = None
    if request.webhook:
        webhook_url = str(request.webhook.url)

    analysis = await analysis_service.create_image_analysis(
        user_id=user.user_id,
        organization_id=user.organization_id,
        source=request.source,
        options=request.options.model_dump() if request.options else None,
        webhook_url=webhook_url,
        metadata=request.metadata,
        idempotency_key=idempotency_key,
    )

    return {
        "data": {
            "id": str(analysis.id),
            "type": "image_analysis",
            "attributes": {
                "status": analysis.status.value,
                "progress": analysis.progress,
                "created_at": analysis.created_at.isoformat(),
            },
            "links": {
                "self": f"/v1/analysis/{analysis.id}",
                "cancel": f"/v1/analysis/{analysis.id}/cancel",
            },
        },
        "meta": {
            "request_id": str(analysis.id),
            "idempotency_key": idempotency_key,
        },
    }


@router.post("/analyze/video", response_model=dict, status_code=status.HTTP_202_ACCEPTED)
async def analyze_video(
    request: VideoAnalysisRequest,
    user: UserContext = Depends(get_current_user),
):
    """
    Analyze a video for deepfakes and AI manipulation.

    Supports YouTube URLs for video analysis:
    - source.type: "youtube"
    - source.url: YouTube video URL

    Video analysis includes:
    - Frame-by-frame AI detection
    - Temporal consistency analysis
    - Suspicious segment identification

    Limits:
    - Maximum video duration: 5 minutes
    - Maximum resolution: 720p
    - Rate limit: 10 videos/hour/user
    """
    # Validate YouTube URL if source type is youtube
    source_type = request.source.get("type")
    if source_type == "youtube":
        youtube_url = request.source.get("url")
        try:
            video_id = video_service.validate_youtube_url(youtube_url)
            # Normalize the URL for consistent storage
            normalized_url = video_service.get_youtube_url_from_id(video_id)
            request.source["url"] = normalized_url
            request.source["video_id"] = video_id
        except VideoValidationError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": e.code, "message": e.message},
            )

    webhook_url = None
    if request.webhook:
        webhook_url = str(request.webhook.url)

    analysis = await analysis_service.create_video_analysis(
        user_id=user.user_id,
        organization_id=user.organization_id,
        source=request.source,
        options=request.options,
        webhook_url=webhook_url,
        priority=request.priority,
        metadata=request.metadata,
    )

    return {
        "data": {
            "id": str(analysis.id),
            "type": "video_analysis",
            "attributes": {
                "status": analysis.status.value,
                "progress": analysis.progress,
                "current_stage": analysis.current_stage or "queued",
                "created_at": analysis.created_at.isoformat(),
            },
            "links": {
                "self": f"/v1/analysis/{analysis.id}",
                "cancel": f"/v1/analysis/{analysis.id}/cancel",
                "progress": f"/v1/analysis/{analysis.id}/progress",
            },
        },
    }


@router.post("/analyze/batch", response_model=dict, status_code=status.HTTP_202_ACCEPTED)
async def analyze_batch(
    request: BatchAnalysisRequest,
    user: UserContext = Depends(get_current_user),
):
    """
    Submit multiple files for batch analysis.

    Batch processing allows you to analyze many files in parallel with a single
    API call. Results are delivered via webhook or can be polled.
    """
    webhook_url = None
    if request.webhook:
        webhook_url = str(request.webhook.url)

    items = [item.model_dump() for item in request.items]

    batch = await analysis_service.create_batch_analysis(
        user_id=user.user_id,
        organization_id=user.organization_id,
        items=items,
        options=request.options,
        webhook_url=webhook_url,
        metadata=request.metadata,
    )

    return {
        "data": {
            "id": str(batch.id),
            "type": "batch_analysis",
            "attributes": {
                "status": batch.status.value,
                "progress": {
                    "total": batch.progress.total,
                    "completed": batch.progress.completed,
                    "failed": batch.progress.failed,
                    "processing": batch.progress.processing,
                    "pending": batch.progress.pending,
                },
                "created_at": batch.created_at.isoformat(),
            },
            "links": {
                "self": f"/v1/batch/{batch.id}",
            },
        },
    }


@router.get("/analysis/{analysis_id}", response_model=dict)
async def get_analysis(
    analysis_id: UUID,
    user: UserContext = Depends(get_current_user),
):
    """Get the status and results of an analysis."""
    analysis = await analysis_service.get_analysis(analysis_id, user.user_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Analysis not found"},
        )

    response_data = {
        "id": str(analysis.id),
        "type": f"{analysis.type.value}_analysis",
        "attributes": {
            "status": analysis.status.value,
            "progress": analysis.progress,
            "current_stage": analysis.current_stage,
            "created_at": analysis.created_at.isoformat(),
            "updated_at": analysis.updated_at.isoformat(),
        },
        "links": {
            "self": f"/v1/analysis/{analysis.id}",
        },
    }

    # Add file info if available
    if analysis.file_name:
        response_data["attributes"]["file"] = {
            "name": analysis.file_name,
            "size_bytes": analysis.file_size_bytes,
            "mime_type": analysis.file_mime_type,
        }

    # Add results if completed
    if analysis.status == AnalysisStatus.COMPLETED:
        result = await analysis_service.get_analysis_result(analysis_id)
        if result:
            results_data = {
                "verdict": result.verdict.value,
                "confidence": result.confidence,
                "risk_level": result.risk_level.value,
                "summary": result.summary,
                "detections": [d.model_dump() for d in result.detections],
                "ensemble_score": result.ensemble_score,
                "heatmap_url": result.heatmap_url,
            }
            # Include video_analysis for video types
            if result.video_analysis:
                results_data["video_analysis"] = result.video_analysis
            response_data["attributes"]["results"] = results_data
        response_data["attributes"]["completed_at"] = (
            analysis.processing_completed_at.isoformat()
            if analysis.processing_completed_at
            else None
        )
        response_data["attributes"]["processing_time_ms"] = analysis.processing_time_ms
        response_data["links"]["results"] = f"/v1/results/{analysis.id}"
        response_data["links"]["export_pdf"] = f"/v1/results/{analysis.id}/export?format=pdf"

    # Add error info if failed
    if analysis.status == AnalysisStatus.FAILED:
        response_data["attributes"]["error"] = {
            "code": analysis.error_code,
            "message": analysis.error_message,
        }

    return {"data": response_data}


@router.post("/analysis/{analysis_id}/cancel", response_model=dict)
async def cancel_analysis(
    analysis_id: UUID,
    user: UserContext = Depends(get_current_user),
):
    """Cancel a pending or processing analysis."""
    success = await analysis_service.cancel_analysis(analysis_id, user.user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "CANNOT_CANCEL",
                "message": "Analysis cannot be cancelled (not found or already completed)",
            },
        )

    return {"message": "Analysis cancelled successfully"}


@router.get("/results", response_model=dict)
async def list_results(
    user: UserContext = Depends(get_current_user),
    limit: int = 20,
    cursor: Optional[str] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
):
    """List analysis results with pagination."""
    status_enum = AnalysisStatus(status) if status else None
    type_enum = AnalysisType(type) if type else None

    analyses = await analysis_service.list_analyses(
        user_id=user.user_id,
        limit=min(limit, 100),
        cursor=cursor,
        status=status_enum,
        analysis_type=type_enum,
    )

    items = []
    for analysis in analyses:
        item = {
            "id": str(analysis.id),
            "type": f"{analysis.type.value}_analysis",
            "attributes": {
                "status": analysis.status.value,
                "created_at": analysis.created_at.isoformat(),
            },
        }
        if analysis.file_name:
            item["attributes"]["file_name"] = analysis.file_name

        items.append(item)

    # Generate next cursor
    next_cursor = None
    if len(analyses) == limit:
        import base64

        next_cursor = base64.b64encode(str(analyses[-1].id).encode()).decode()

    return {
        "data": items,
        "pagination": {
            "has_more": len(analyses) == limit,
            "next_cursor": next_cursor,
        },
        "meta": {
            "returned_count": len(analyses),
        },
    }


@router.get("/results/{analysis_id}", response_model=dict)
async def get_result(
    analysis_id: UUID,
    user: UserContext = Depends(get_current_user),
):
    """Get detailed results for a completed analysis."""
    analysis = await analysis_service.get_analysis(analysis_id, user.user_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Analysis not found"},
        )

    if analysis.status != AnalysisStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "NOT_COMPLETED",
                "message": f"Analysis is still {analysis.status.value}",
            },
        )

    result = await analysis_service.get_analysis_result(analysis_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESULTS_NOT_FOUND", "message": "Results not found"},
        )

    return {
        "data": {
            "id": str(analysis_id),
            "type": "analysis_result",
            "attributes": {
                "verdict": result.verdict.value,
                "confidence": result.confidence,
                "risk_level": result.risk_level.value,
                "summary": result.summary,
                "detections": [d.model_dump() for d in result.detections],
                "ensemble_score": result.ensemble_score,
                "heatmap_url": result.heatmap_url,
                "metadata": result.metadata.model_dump() if result.metadata else None,
            },
            "relationships": {
                "analysis": {"id": str(analysis_id), "type": "analysis"},
            },
        },
    }


# ============================================================================
# Demo Endpoints (No Authentication Required)
# ============================================================================


@router.post("/demo/analyze/video", response_model=dict, status_code=status.HTTP_202_ACCEPTED)
async def demo_analyze_video(
    request: DemoVideoAnalysisRequest,
    http_request: Request,
):
    """
    Analyze a YouTube video for AI-generated content (demo mode).

    No authentication required. Rate limited to 3 requests per hour per IP.
    Maximum video duration: 20 seconds.
    """
    # Get client IP for rate limiting
    client_ip = await get_client_ip(http_request)

    # Check rate limit
    await check_demo_rate_limit(client_ip)

    # Validate YouTube URL
    try:
        video_id = video_service.validate_youtube_url(request.youtube_url)
        normalized_url = video_service.get_youtube_url_from_id(video_id)
    except VideoValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": e.code, "message": e.message},
        )

    # Create demo video analysis (duration validation happens in worker)
    analysis = await analysis_service.create_demo_video_analysis(
        youtube_url=normalized_url,
        video_id=video_id,
        client_ip=client_ip,
    )

    return {
        "data": {
            "id": str(analysis.id),
            "type": "demo_video_analysis",
            "attributes": {
                "status": analysis.status.value,
                "progress": analysis.progress,
                "current_stage": analysis.current_stage or "queued",
                "created_at": analysis.created_at.isoformat(),
            },
            "links": {
                "self": f"/v1/demo/analysis/{analysis.id}",
            },
        },
    }


@router.get("/demo/analysis/{analysis_id}", response_model=dict)
async def get_demo_analysis(analysis_id: UUID):
    """
    Get the status and results of a demo analysis.

    No authentication required. Only works for demo analyses.
    """
    analysis = await analysis_service.get_demo_analysis(analysis_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Analysis not found"},
        )

    response_data = {
        "id": str(analysis.id),
        "type": "demo_video_analysis",
        "attributes": {
            "status": analysis.status.value,
            "progress": analysis.progress,
            "current_stage": analysis.current_stage,
            "created_at": analysis.created_at.isoformat(),
            "updated_at": analysis.updated_at.isoformat(),
        },
    }

    # Add results if completed
    if analysis.status == AnalysisStatus.COMPLETED:
        result = await analysis_service.get_analysis_result(analysis_id)
        if result:
            results_data = {
                "verdict": result.verdict.value,
                "confidence": result.confidence,
                "risk_level": result.risk_level.value,
                "summary": result.summary,
                "ensemble_score": result.ensemble_score,
            }
            # Include frame results for video analysis
            if result.video_analysis:
                results_data["video_analysis"] = result.video_analysis
            response_data["attributes"]["results"] = results_data
        response_data["attributes"]["completed_at"] = (
            analysis.processing_completed_at.isoformat()
            if analysis.processing_completed_at
            else None
        )
        response_data["attributes"]["processing_time_ms"] = analysis.processing_time_ms

    # Add error info if failed
    if analysis.status == AnalysisStatus.FAILED:
        response_data["attributes"]["error"] = {
            "code": analysis.error_code,
            "message": analysis.error_message,
        }

    return {"data": response_data}
