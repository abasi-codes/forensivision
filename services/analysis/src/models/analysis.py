from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class AnalysisType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    DOCUMENT = "document"


class AnalysisStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class VerdictType(str, Enum):
    AUTHENTIC = "authentic"
    LIKELY_AUTHENTIC = "likely_authentic"
    INCONCLUSIVE = "inconclusive"
    LIKELY_AI = "likely_ai"
    AI_GENERATED = "ai_generated"
    MANIPULATED = "manipulated"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# Request Models


class SourceUrl(BaseModel):
    type: str = "url"
    url: HttpUrl


class SourceUpload(BaseModel):
    type: str = "upload"
    upload_id: str


class AnalysisOptions(BaseModel):
    models: Optional[List[str]] = None
    detail_level: str = "standard"  # basic, standard, full, comprehensive
    include_heatmap: bool = False
    include_metadata: bool = True
    sync: bool = False  # For small files, return results synchronously


class WebhookConfig(BaseModel):
    url: HttpUrl
    secret: Optional[str] = None
    events: List[str] = ["analysis.completed", "analysis.failed"]


class ImageAnalysisRequest(BaseModel):
    source: Dict[str, Any]
    options: Optional[AnalysisOptions] = None
    webhook: Optional[WebhookConfig] = None
    metadata: Optional[Dict[str, Any]] = None


class VideoAnalysisRequest(BaseModel):
    source: Dict[str, Any]
    options: Optional[Dict[str, Any]] = None
    webhook: Optional[WebhookConfig] = None
    priority: str = "normal"
    metadata: Optional[Dict[str, Any]] = None


class DemoVideoAnalysisRequest(BaseModel):
    """Request model for demo video analysis (no auth required)."""
    youtube_url: str


class BatchItem(BaseModel):
    id: str
    type: AnalysisType
    source: Dict[str, Any]
    options: Optional[Dict[str, Any]] = None


class BatchAnalysisRequest(BaseModel):
    items: List[BatchItem]
    options: Optional[Dict[str, Any]] = None
    webhook: Optional[WebhookConfig] = None
    metadata: Optional[Dict[str, Any]] = None


# Response Models


class FileInfo(BaseModel):
    name: Optional[str] = None
    size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    dimensions: Optional[Dict[str, int]] = None
    duration_seconds: Optional[float] = None
    resolution: Optional[str] = None
    fps: Optional[float] = None


class Detection(BaseModel):
    model: str
    verdict: VerdictType
    confidence: float
    details: Optional[Dict[str, Any]] = None


class MetadataAnalysis(BaseModel):
    exif: Optional[Dict[str, Any]] = None
    forensic: Optional[Dict[str, Any]] = None
    c2pa_verified: Optional[bool] = None
    watermark_detected: Optional[bool] = None


class AnalysisResult(BaseModel):
    verdict: VerdictType
    confidence: float
    risk_level: RiskLevel
    summary: str
    detections: List[Detection]
    ensemble_score: Optional[float] = None
    heatmap_url: Optional[str] = None
    metadata: Optional[MetadataAnalysis] = None
    video_analysis: Optional[Dict[str, Any]] = None


class AnalysisStage(BaseModel):
    name: str
    status: str
    duration_ms: Optional[int] = None
    progress: Optional[int] = None


class AnalysisResponse(BaseModel):
    id: UUID
    type: str
    status: AnalysisStatus
    progress: Optional[int] = None
    current_stage: Optional[str] = None
    stages: Optional[List[AnalysisStage]] = None
    estimated_completion: Optional[datetime] = None
    file: Optional[FileInfo] = None
    options: Optional[Dict[str, Any]] = None
    results: Optional[AnalysisResult] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class BatchProgress(BaseModel):
    total: int
    completed: int
    failed: int
    processing: int
    pending: int


class BatchItemStatus(BaseModel):
    id: str
    analysis_id: Optional[UUID] = None
    status: AnalysisStatus
    verdict: Optional[VerdictType] = None
    confidence: Optional[float] = None
    error: Optional[str] = None


class BatchAnalysisResponse(BaseModel):
    id: UUID
    type: str = "batch_analysis"
    status: AnalysisStatus
    progress: BatchProgress
    items: Optional[List[BatchItemStatus]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


# Database Models


class AnalysisDB(BaseModel):
    id: UUID
    user_id: UUID
    organization_id: Optional[UUID] = None
    type: AnalysisType
    status: AnalysisStatus
    priority: int = 5
    file_key: Optional[str] = None
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    file_mime_type: Optional[str] = None
    file_hash: Optional[str] = None
    duration_seconds: Optional[float] = None
    resolution: Optional[str] = None
    fps: Optional[float] = None
    progress: int = 0
    current_stage: Optional[str] = None
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    processing_time_ms: Optional[int] = None
    options: Dict[str, Any] = Field(default_factory=dict)
    webhook_url: Optional[str] = None
    external_id: Optional[str] = None
    idempotency_key: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
