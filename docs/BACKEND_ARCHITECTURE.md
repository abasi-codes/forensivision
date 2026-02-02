# ForensiVision Backend & API Architecture

## Technical Specification Document

**Version:** 1.0.0
**Last Updated:** 2026-02-02
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [API Design](#3-api-design)
4. [Core API Endpoints](#4-core-api-endpoints)
5. [Processing Pipeline](#5-processing-pipeline)
6. [Scalability Considerations](#6-scalability-considerations)
7. [Error Handling](#7-error-handling)
8. [Security Architecture](#8-security-architecture)
9. [Monitoring & Observability](#9-monitoring--observability)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

ForensiVision is an AI-powered content detection platform designed to identify AI-generated and manipulated media including images, videos, and deepfakes. The platform serves two primary interfaces:

- **Web UI**: Dashboard for enterprise users to upload, analyze, and manage detection results
- **Public API**: RESTful API for programmatic integration into third-party applications

### Design Principles

- **Scalability First**: Horizontal scaling for ML inference workloads
- **Async by Default**: Long-running analysis tasks handled asynchronously
- **Security**: Zero-trust architecture with defense in depth
- **Developer Experience**: Clear, consistent, well-documented APIs
- **Resilience**: Graceful degradation and comprehensive error handling

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────────┬───────────────────────┬───────────────────────────────┤
│     Web UI          │    Mobile Apps        │    Third-Party Integrations   │
│   (React/Next.js)   │    (iOS/Android)      │    (API Consumers)            │
└─────────┬───────────┴───────────┬───────────┴───────────────┬───────────────┘
          │                       │                           │
          ▼                       ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CDN / EDGE LAYER                                     │
│                    (CloudFlare / AWS CloudFront)                            │
│              - Static asset caching                                          │
│              - DDoS protection                                               │
│              - Geographic routing                                            │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LOAD BALANCER                                        │
│                    (AWS ALB / nginx / Traefik)                              │
│              - SSL termination                                               │
│              - Health checks                                                 │
│              - Request routing                                               │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                                          │
│                    (Kong / AWS API Gateway)                                  │
│              - Rate limiting                                                 │
│              - API key validation                                            │
│              - Request transformation                                        │
│              - Analytics & logging                                           │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MICROSERVICES LAYER                                     │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────────┤
│   Auth       │   Analysis   │   Storage    │   Webhook    │   Billing       │
│   Service    │   Service    │   Service    │   Service    │   Service       │
├──────────────┼──────────────┼──────────────┼──────────────┼─────────────────┤
│   User       │   Results    │   Audit      │   Notifi-    │   Analytics     │
│   Service    │   Service    │   Service    │   cation     │   Service       │
│              │              │              │   Service    │                 │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────────┘
          │                       │
          ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MESSAGE QUEUE                                           │
│                    (RabbitMQ / AWS SQS)                                      │
│              - Task distribution                                             │
│              - Dead letter queues                                            │
│              - Priority queues                                               │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ML INFERENCE LAYER                                      │
├──────────────┬──────────────┬──────────────┬────────────────────────────────┤
│   Image      │   Video      │   Audio      │   Ensemble                     │
│   Workers    │   Workers    │   Workers    │   Orchestrator                 │
│   (GPU)      │   (GPU)      │   (GPU)      │                                │
└──────────────┴──────────────┴──────────────┴────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                              │
├──────────────┬──────────────┬──────────────┬────────────────────────────────┤
│   PostgreSQL │   Redis      │   S3/MinIO   │   Elasticsearch                │
│   (Primary)  │   (Cache)    │   (Objects)  │   (Search/Logs)                │
└──────────────┴──────────────┴──────────────┴────────────────────────────────┘
```

### 2.2 Microservices Breakdown

#### 2.2.1 API Gateway Service

**Responsibility**: Single entry point for all API requests

| Aspect | Details |
|--------|---------|
| Technology | Kong Gateway or AWS API Gateway |
| Functions | Rate limiting, API key validation, request routing, request/response transformation, analytics |
| Scaling | Horizontal via load balancer |
| Dependencies | Redis (rate limit counters), Auth Service |

#### 2.2.2 Auth Service

**Responsibility**: Authentication and authorization

| Aspect | Details |
|--------|---------|
| Technology | Go with Gin framework |
| Functions | JWT issuance/validation, API key management, OAuth 2.0 flows, RBAC |
| Database | PostgreSQL (users, api_keys, permissions) |
| Cache | Redis (session tokens, refresh tokens) |

```go
// Auth Service Core Interfaces
type AuthService interface {
    // JWT Operations
    IssueAccessToken(userID string, scopes []string) (*Token, error)
    ValidateAccessToken(token string) (*Claims, error)
    RefreshAccessToken(refreshToken string) (*Token, error)

    // API Key Operations
    CreateAPIKey(userID string, name string, scopes []string) (*APIKey, error)
    ValidateAPIKey(key string) (*APIKeyInfo, error)
    RevokeAPIKey(keyID string) error

    // OAuth 2.0
    AuthorizeOAuth(req *OAuthRequest) (*OAuthResponse, error)
    ExchangeCode(code string) (*Token, error)
}
```

#### 2.2.3 Analysis Service

**Responsibility**: Orchestrates content analysis workflows

| Aspect | Details |
|--------|---------|
| Technology | Python with FastAPI |
| Functions | Job creation, status tracking, result aggregation |
| Database | PostgreSQL (jobs, results metadata) |
| Queue | RabbitMQ/SQS (job dispatch) |

```python
# Analysis Service Core Models
from pydantic import BaseModel
from enum import Enum
from typing import Optional, List
from datetime import datetime

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

class AnalysisJob(BaseModel):
    id: str
    user_id: str
    type: AnalysisType
    status: AnalysisStatus
    file_key: str
    webhook_url: Optional[str]
    priority: int = 5
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    results: Optional[dict]
    error: Optional[str]
```

#### 2.2.4 Storage Service

**Responsibility**: Manages file uploads and storage

| Aspect | Details |
|--------|---------|
| Technology | Go with Gin framework |
| Functions | Presigned URL generation, file validation, virus scanning, metadata extraction |
| Storage | S3/MinIO for objects, PostgreSQL for metadata |

#### 2.2.5 Results Service

**Responsibility**: Stores and retrieves analysis results

| Aspect | Details |
|--------|---------|
| Technology | Go with Gin framework |
| Functions | Result persistence, aggregation, export |
| Database | PostgreSQL (results), Elasticsearch (search) |

#### 2.2.6 Webhook Service

**Responsibility**: Delivers async notifications

| Aspect | Details |
|--------|---------|
| Technology | Go with Gin framework |
| Functions | Webhook delivery, retry management, signature generation |
| Queue | RabbitMQ (delivery queue with DLQ) |

#### 2.2.7 User Service

**Responsibility**: User profile and organization management

| Aspect | Details |
|--------|---------|
| Technology | Go with Gin framework |
| Functions | User CRUD, organization management, team permissions |
| Database | PostgreSQL |

#### 2.2.8 Billing Service

**Responsibility**: Usage tracking and billing

| Aspect | Details |
|--------|---------|
| Technology | Go with Gin framework |
| Functions | Usage metering, subscription management, invoice generation |
| Integration | Stripe for payments |
| Database | PostgreSQL |

#### 2.2.9 ML Worker Services

**Responsibility**: Execute ML inference

| Aspect | Details |
|--------|---------|
| Technology | Python with PyTorch/TensorFlow |
| Deployment | Kubernetes with GPU node pools |
| Scaling | Horizontal Pod Autoscaler based on queue depth |

### 2.3 Communication Patterns

#### Synchronous (REST/gRPC)

Used for:
- Authentication requests
- Presigned URL generation
- Status queries
- User/account operations

#### Asynchronous (Message Queue)

Used for:
- Analysis job dispatch
- Webhook delivery
- Billing event processing
- Audit log ingestion

```yaml
# Queue Configuration
queues:
  analysis.image:
    durable: true
    priority: true
    max_priority: 10
    dead_letter_exchange: dlx.analysis
    message_ttl: 3600000  # 1 hour

  analysis.video:
    durable: true
    priority: true
    max_priority: 10
    dead_letter_exchange: dlx.analysis
    message_ttl: 7200000  # 2 hours

  analysis.batch:
    durable: true
    priority: true
    max_priority: 10
    dead_letter_exchange: dlx.analysis
    message_ttl: 14400000  # 4 hours

  webhooks.delivery:
    durable: true
    dead_letter_exchange: dlx.webhooks
    message_ttl: 86400000  # 24 hours

  billing.events:
    durable: true
    dead_letter_exchange: dlx.billing
```

### 2.4 Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **API Gateway** | Kong / AWS API Gateway | Enterprise features, plugin ecosystem |
| **Backend Services** | Go (Gin) / Python (FastAPI) | Go for high-throughput services, Python for ML-adjacent |
| **ML Inference** | Python, PyTorch, ONNX Runtime | Industry standard, GPU optimization |
| **Message Queue** | RabbitMQ / AWS SQS | Reliability, dead letter queues, priority queues |
| **Primary Database** | PostgreSQL 15+ | ACID compliance, JSON support, mature ecosystem |
| **Cache** | Redis 7+ | Sub-millisecond latency, data structures |
| **Object Storage** | AWS S3 / MinIO | Scalable, cost-effective, presigned URLs |
| **Search** | Elasticsearch / OpenSearch | Full-text search, analytics |
| **Container Orchestration** | Kubernetes (EKS/GKE) | GPU scheduling, horizontal scaling |
| **Observability** | Prometheus, Grafana, Jaeger | Metrics, dashboards, distributed tracing |

---

## 3. API Design

### 3.1 Design Principles

1. **RESTful conventions** with pragmatic deviations where necessary
2. **JSON:API** inspired response format
3. **Consistent error handling** across all endpoints
4. **Idempotency** for all mutating operations
5. **HATEOAS** links for discoverability

### 3.2 Base URL Structure

```
Production:  https://api.forensivision.com/v1
Staging:     https://api.staging.forensivision.com/v1
Sandbox:     https://api.sandbox.forensivision.com/v1
```

### 3.3 Authentication Methods

#### 3.3.1 API Keys

For server-to-server integration.

```http
GET /v1/results/abc123 HTTP/1.1
Host: api.forensivision.com
Authorization: Bearer fv_live_sk_a1b2c3d4e5f6...
X-Request-ID: req_unique_id_12345
```

**API Key Format:**
```
fv_{environment}_{type}_{random}

Examples:
fv_live_sk_a1b2c3d4e5f6g7h8i9j0...  (Live secret key)
fv_live_pk_x9y8z7w6v5u4t3s2r1q0...  (Live publishable key)
fv_test_sk_m1n2o3p4q5r6s7t8u9v0...  (Test secret key)
```

#### 3.3.2 OAuth 2.0 + JWT

For user-facing applications.

```http
POST /v1/oauth/token HTTP/1.1
Host: api.forensivision.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE
&redirect_uri=https://yourapp.com/callback
&client_id=CLIENT_ID
&client_secret=CLIENT_SECRET
```

**JWT Token Structure:**
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key-id-2024-01"
  },
  "payload": {
    "iss": "https://api.forensivision.com",
    "sub": "user_abc123",
    "aud": "https://api.forensivision.com",
    "exp": 1706918400,
    "iat": 1706832000,
    "scope": "analyze:read analyze:write results:read",
    "org_id": "org_xyz789",
    "tier": "enterprise"
  }
}
```

#### 3.3.3 Scopes

| Scope | Description |
|-------|-------------|
| `analyze:read` | View analysis jobs and queue status |
| `analyze:write` | Create new analysis jobs |
| `results:read` | Read analysis results |
| `results:export` | Export results (PDF, JSON) |
| `webhooks:manage` | Create/update/delete webhooks |
| `usage:read` | View usage statistics |
| `billing:read` | View billing information |
| `billing:write` | Update billing settings |
| `admin:*` | Full administrative access |

### 3.4 Rate Limiting Strategy

#### Tiered Limits

| Tier | Requests/Min | Requests/Hour | Concurrent Jobs | Burst |
|------|--------------|---------------|-----------------|-------|
| Free | 20 | 500 | 5 | 30 |
| Starter | 60 | 3,000 | 20 | 100 |
| Professional | 300 | 15,000 | 100 | 500 |
| Enterprise | 1,000 | 60,000 | 500 | 2,000 |
| Custom | Negotiated | Negotiated | Negotiated | Negotiated |

#### Rate Limit Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 297
X-RateLimit-Reset: 1706832060
X-RateLimit-Policy: 300;w=60
Retry-After: 45
```

#### Rate Limit Response (429)

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 45 seconds.",
    "type": "rate_limit_error",
    "details": {
      "limit": 300,
      "remaining": 0,
      "reset_at": "2026-02-02T12:01:00Z",
      "retry_after": 45
    }
  },
  "request_id": "req_abc123"
}
```

### 3.5 Versioning Strategy

**URL-based versioning** with deprecation headers:

```http
GET /v1/results/abc123 HTTP/1.1
Host: api.forensivision.com
```

**Deprecation Response Headers:**

```http
HTTP/1.1 200 OK
Deprecation: Sun, 01 Jun 2026 00:00:00 GMT
Sunset: Sun, 01 Dec 2026 00:00:00 GMT
Link: <https://api.forensivision.com/v2/results/abc123>; rel="successor-version"
```

**Version Lifecycle:**

| Phase | Duration | Behavior |
|-------|----------|----------|
| Current | Indefinite | Full support |
| Deprecated | 6 months | Works with deprecation headers |
| Sunset | 3 months | Returns warnings, reduced SLA |
| Retired | - | Returns 410 Gone |

### 3.6 Standard Response Format

#### Success Response

```json
{
  "data": {
    "id": "analysis_abc123",
    "type": "analysis",
    "attributes": {
      "status": "completed",
      "created_at": "2026-02-02T10:30:00Z",
      "completed_at": "2026-02-02T10:30:45Z"
    },
    "relationships": {
      "results": {
        "data": { "id": "result_xyz789", "type": "result" }
      }
    },
    "links": {
      "self": "/v1/analysis/analysis_abc123",
      "results": "/v1/results/result_xyz789"
    }
  },
  "meta": {
    "request_id": "req_def456",
    "processing_time_ms": 45230
  }
}
```

#### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request body contains invalid parameters.",
    "type": "invalid_request_error",
    "details": [
      {
        "field": "file_url",
        "code": "INVALID_URL",
        "message": "The provided URL is not accessible or returns an error."
      }
    ],
    "documentation_url": "https://docs.forensivision.com/errors/validation-error"
  },
  "request_id": "req_abc123"
}
```

### 3.7 Pagination

**Cursor-based pagination** for all list endpoints:

```http
GET /v1/results?limit=20&cursor=eyJpZCI6ImFiYzEyMyJ9 HTTP/1.1
```

**Response:**

```json
{
  "data": [...],
  "pagination": {
    "has_more": true,
    "next_cursor": "eyJpZCI6Inh5ejc4OSJ9",
    "prev_cursor": "eyJpZCI6ImRlZjQ1NiJ9"
  },
  "meta": {
    "total_count": 1547,
    "returned_count": 20
  }
}
```

---

## 4. Core API Endpoints

### 4.1 Analysis Endpoints

#### 4.1.1 POST /v1/analyze/image

Analyze a single image for AI-generated content.

**Request:**

```http
POST /v1/analyze/image HTTP/1.1
Host: api.forensivision.com
Authorization: Bearer fv_live_sk_...
Content-Type: application/json
Idempotency-Key: idem_unique_key_123

{
  "source": {
    "type": "url",
    "url": "https://example.com/image.jpg"
  },
  "options": {
    "models": ["deepfake_v3", "gan_detector_v2", "diffusion_v1"],
    "detail_level": "comprehensive",
    "include_heatmap": true,
    "include_metadata": true
  },
  "webhook": {
    "url": "https://yourapp.com/webhooks/forensivision",
    "secret": "whsec_your_webhook_secret",
    "events": ["analysis.completed", "analysis.failed"]
  },
  "metadata": {
    "external_id": "your-internal-id-123",
    "source": "user_upload",
    "tags": ["profile_photo", "verification"]
  }
}
```

**Alternative: File Upload via Multipart**

```http
POST /v1/analyze/image HTTP/1.1
Host: api.forensivision.com
Authorization: Bearer fv_live_sk_...
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="image.jpg"
Content-Type: image/jpeg

[binary data]
------WebKitFormBoundary
Content-Disposition: form-data; name="options"
Content-Type: application/json

{"models": ["deepfake_v3"], "detail_level": "standard"}
------WebKitFormBoundary--
```

**Alternative: Presigned Upload Flow**

```http
# Step 1: Request upload URL
POST /v1/uploads HTTP/1.1
Authorization: Bearer fv_live_sk_...

{
  "filename": "image.jpg",
  "content_type": "image/jpeg",
  "size_bytes": 2048576
}

# Response
{
  "data": {
    "upload_id": "upload_abc123",
    "upload_url": "https://uploads.forensivision.com/presigned/...",
    "expires_at": "2026-02-02T11:00:00Z"
  }
}

# Step 2: Upload file directly to presigned URL
PUT https://uploads.forensivision.com/presigned/... HTTP/1.1
Content-Type: image/jpeg
Content-Length: 2048576

[binary data]

# Step 3: Create analysis with upload_id
POST /v1/analyze/image HTTP/1.1

{
  "source": {
    "type": "upload",
    "upload_id": "upload_abc123"
  }
}
```

**Response (Async):**

```json
{
  "data": {
    "id": "analysis_img_abc123",
    "type": "image_analysis",
    "attributes": {
      "status": "processing",
      "progress": 0,
      "estimated_completion": "2026-02-02T10:31:00Z",
      "created_at": "2026-02-02T10:30:00Z",
      "file": {
        "name": "image.jpg",
        "size_bytes": 2048576,
        "mime_type": "image/jpeg",
        "dimensions": {
          "width": 1920,
          "height": 1080
        }
      },
      "options": {
        "models": ["deepfake_v3", "gan_detector_v2", "diffusion_v1"],
        "detail_level": "comprehensive"
      }
    },
    "links": {
      "self": "/v1/analysis/analysis_img_abc123",
      "cancel": "/v1/analysis/analysis_img_abc123/cancel"
    }
  },
  "meta": {
    "request_id": "req_xyz789",
    "idempotency_key": "idem_unique_key_123"
  }
}
```

**Response (Sync - for small files with sync=true):**

```json
{
  "data": {
    "id": "analysis_img_abc123",
    "type": "image_analysis",
    "attributes": {
      "status": "completed",
      "created_at": "2026-02-02T10:30:00Z",
      "completed_at": "2026-02-02T10:30:12Z",
      "file": {
        "name": "image.jpg",
        "size_bytes": 524288,
        "mime_type": "image/jpeg"
      },
      "results": {
        "verdict": "ai_generated",
        "confidence": 0.94,
        "risk_level": "high",
        "summary": "This image shows strong indicators of AI generation, likely from a diffusion-based model.",
        "detections": [
          {
            "model": "deepfake_v3",
            "verdict": "ai_generated",
            "confidence": 0.92,
            "details": {
              "generation_type": "full_synthetic",
              "likely_source": "stable_diffusion",
              "artifacts_detected": ["texture_inconsistency", "lighting_anomaly"]
            }
          },
          {
            "model": "gan_detector_v2",
            "verdict": "ai_generated",
            "confidence": 0.89,
            "details": {
              "frequency_analysis": "abnormal",
              "noise_pattern": "synthetic"
            }
          },
          {
            "model": "diffusion_v1",
            "verdict": "ai_generated",
            "confidence": 0.96,
            "details": {
              "model_family": "latent_diffusion",
              "estimated_steps": "20-50"
            }
          }
        ],
        "ensemble_score": 0.94,
        "heatmap_url": "https://results.forensivision.com/heatmaps/abc123.png",
        "metadata": {
          "exif": {
            "software": null,
            "camera_make": null,
            "creation_date": null
          },
          "forensic": {
            "jpeg_quality": 85,
            "compression_artifacts": "minimal",
            "color_profile": "sRGB"
          }
        }
      }
    },
    "links": {
      "self": "/v1/analysis/analysis_img_abc123",
      "results": "/v1/results/analysis_img_abc123",
      "export_pdf": "/v1/results/analysis_img_abc123/export?format=pdf"
    }
  },
  "meta": {
    "request_id": "req_xyz789",
    "processing_time_ms": 12340
  }
}
```

#### 4.1.2 POST /v1/analyze/video

Analyze a video for deepfakes and AI manipulation.

**Request:**

```json
{
  "source": {
    "type": "url",
    "url": "https://example.com/video.mp4"
  },
  "options": {
    "models": ["face_swap_v2", "lip_sync_v1", "audio_deepfake_v1"],
    "analysis_mode": "full",
    "frame_sampling": {
      "strategy": "adaptive",
      "min_fps": 1,
      "max_fps": 5
    },
    "face_tracking": true,
    "audio_analysis": true,
    "temporal_consistency": true
  },
  "webhook": {
    "url": "https://yourapp.com/webhooks/forensivision",
    "events": ["analysis.progress", "analysis.completed", "analysis.failed"]
  },
  "priority": "high",
  "metadata": {
    "external_id": "video-check-456"
  }
}
```

**Response:**

```json
{
  "data": {
    "id": "analysis_vid_def456",
    "type": "video_analysis",
    "attributes": {
      "status": "processing",
      "progress": 15,
      "current_stage": "frame_extraction",
      "stages": [
        { "name": "upload_validation", "status": "completed", "duration_ms": 1200 },
        { "name": "frame_extraction", "status": "in_progress", "progress": 45 },
        { "name": "face_detection", "status": "pending" },
        { "name": "deepfake_analysis", "status": "pending" },
        { "name": "audio_analysis", "status": "pending" },
        { "name": "temporal_analysis", "status": "pending" },
        { "name": "result_aggregation", "status": "pending" }
      ],
      "estimated_completion": "2026-02-02T10:45:00Z",
      "file": {
        "name": "video.mp4",
        "size_bytes": 52428800,
        "mime_type": "video/mp4",
        "duration_seconds": 120,
        "resolution": "1920x1080",
        "fps": 30
      }
    },
    "links": {
      "self": "/v1/analysis/analysis_vid_def456",
      "cancel": "/v1/analysis/analysis_vid_def456/cancel",
      "progress": "/v1/analysis/analysis_vid_def456/progress"
    }
  }
}
```

**Completed Video Analysis Results:**

```json
{
  "data": {
    "id": "analysis_vid_def456",
    "type": "video_analysis",
    "attributes": {
      "status": "completed",
      "results": {
        "verdict": "manipulated",
        "confidence": 0.87,
        "risk_level": "high",
        "summary": "Face swap detected on primary subject between timestamps 0:15-1:45.",
        "video_analysis": {
          "frames_analyzed": 3600,
          "faces_detected": 2,
          "manipulation_segments": [
            {
              "start_time": 15.0,
              "end_time": 105.0,
              "type": "face_swap",
              "confidence": 0.91,
              "affected_face_id": 1,
              "details": {
                "blending_artifacts": true,
                "temporal_inconsistency": true,
                "boundary_detection": "visible_seams"
              }
            }
          ]
        },
        "audio_analysis": {
          "verdict": "authentic",
          "confidence": 0.95,
          "lip_sync_score": 0.72,
          "voice_consistency": 0.94
        },
        "temporal_analysis": {
          "frame_consistency": 0.65,
          "motion_artifacts": ["jitter_detected", "interpolation_artifacts"],
          "compression_analysis": "multiple_generations"
        },
        "face_tracking": [
          {
            "face_id": 1,
            "first_appearance": 0.0,
            "last_appearance": 120.0,
            "manipulation_detected": true,
            "thumbnail_url": "https://results.forensivision.com/faces/def456_f1.jpg"
          }
        ]
      }
    }
  }
}
```

#### 4.1.3 POST /v1/analyze/batch

Submit multiple files for batch analysis.

**Request:**

```json
{
  "items": [
    {
      "id": "item_1",
      "type": "image",
      "source": {
        "type": "url",
        "url": "https://example.com/image1.jpg"
      }
    },
    {
      "id": "item_2",
      "type": "image",
      "source": {
        "type": "url",
        "url": "https://example.com/image2.png"
      }
    },
    {
      "id": "item_3",
      "type": "video",
      "source": {
        "type": "upload",
        "upload_id": "upload_xyz789"
      }
    }
  ],
  "options": {
    "default_models": ["deepfake_v3", "gan_detector_v2"],
    "parallel_limit": 10,
    "stop_on_failure": false
  },
  "webhook": {
    "url": "https://yourapp.com/webhooks/forensivision",
    "events": ["batch.item_completed", "batch.completed", "batch.failed"]
  },
  "metadata": {
    "batch_name": "Content moderation queue - Feb 2",
    "external_id": "batch-2026-02-02-001"
  }
}
```

**Response:**

```json
{
  "data": {
    "id": "batch_ghi789",
    "type": "batch_analysis",
    "attributes": {
      "status": "processing",
      "progress": {
        "total": 3,
        "completed": 0,
        "failed": 0,
        "processing": 2,
        "pending": 1
      },
      "items": [
        {
          "id": "item_1",
          "analysis_id": "analysis_img_001",
          "status": "processing"
        },
        {
          "id": "item_2",
          "analysis_id": "analysis_img_002",
          "status": "processing"
        },
        {
          "id": "item_3",
          "analysis_id": "analysis_vid_003",
          "status": "pending"
        }
      ],
      "created_at": "2026-02-02T10:30:00Z",
      "estimated_completion": "2026-02-02T11:00:00Z"
    },
    "links": {
      "self": "/v1/batch/batch_ghi789",
      "items": "/v1/batch/batch_ghi789/items",
      "cancel": "/v1/batch/batch_ghi789/cancel"
    }
  }
}
```

#### 4.1.4 GET /v1/results/{id}

Retrieve analysis results.

**Request:**

```http
GET /v1/results/analysis_img_abc123 HTTP/1.1
Authorization: Bearer fv_live_sk_...
Accept: application/json
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `include` | string | Comma-separated: `heatmap`, `metadata`, `raw_scores` |
| `format` | string | Response format: `json` (default), `summary` |

**Response:**

```json
{
  "data": {
    "id": "analysis_img_abc123",
    "type": "analysis_result",
    "attributes": {
      "analysis_id": "analysis_img_abc123",
      "status": "completed",
      "verdict": "ai_generated",
      "confidence": 0.94,
      "risk_level": "high",
      "created_at": "2026-02-02T10:30:00Z",
      "completed_at": "2026-02-02T10:30:12Z",
      "file": {
        "name": "image.jpg",
        "hash_sha256": "a1b2c3d4e5f6...",
        "size_bytes": 2048576
      },
      "detections": [
        {
          "model_id": "deepfake_v3",
          "model_version": "3.2.1",
          "verdict": "ai_generated",
          "confidence": 0.92,
          "execution_time_ms": 2340,
          "details": {
            "primary_indicators": [
              "synthetic_texture_pattern",
              "inconsistent_lighting",
              "frequency_domain_anomaly"
            ],
            "secondary_indicators": [
              "unusual_noise_distribution"
            ]
          }
        }
      ],
      "ensemble": {
        "method": "weighted_voting",
        "weights": {
          "deepfake_v3": 0.4,
          "gan_detector_v2": 0.35,
          "diffusion_v1": 0.25
        },
        "final_score": 0.94
      },
      "explanation": {
        "summary": "This image exhibits multiple characteristics consistent with AI generation.",
        "key_findings": [
          "Texture patterns show synthetic regularities not found in natural photographs",
          "Frequency analysis reveals artifacts typical of diffusion-based generation",
          "Lighting consistency analysis shows physically implausible shadows"
        ],
        "confidence_factors": {
          "increases_confidence": [
            "Multiple independent models agree",
            "Strong frequency domain signals"
          ],
          "decreases_confidence": [
            "JPEG compression may mask some artifacts"
          ]
        }
      }
    },
    "relationships": {
      "analysis": {
        "data": { "id": "analysis_img_abc123", "type": "analysis" }
      },
      "heatmap": {
        "data": { "id": "heatmap_abc123", "type": "heatmap" }
      }
    },
    "links": {
      "self": "/v1/results/analysis_img_abc123",
      "analysis": "/v1/analysis/analysis_img_abc123",
      "heatmap": "/v1/results/analysis_img_abc123/heatmap",
      "export_pdf": "/v1/results/analysis_img_abc123/export?format=pdf",
      "export_json": "/v1/results/analysis_img_abc123/export?format=json"
    }
  },
  "meta": {
    "request_id": "req_export_001"
  }
}
```

#### 4.1.5 GET /v1/usage

Retrieve API usage statistics.

**Request:**

```http
GET /v1/usage?period=month&start_date=2026-01-01&end_date=2026-01-31 HTTP/1.1
Authorization: Bearer fv_live_sk_...
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | string | Aggregation: `day`, `week`, `month` |
| `start_date` | date | Start of period (ISO 8601) |
| `end_date` | date | End of period (ISO 8601) |
| `group_by` | string | Group by: `endpoint`, `model`, `status` |

**Response:**

```json
{
  "data": {
    "id": "usage_2026_01",
    "type": "usage_report",
    "attributes": {
      "period": {
        "start": "2026-01-01T00:00:00Z",
        "end": "2026-01-31T23:59:59Z"
      },
      "summary": {
        "total_requests": 15420,
        "total_analyses": 12350,
        "images_analyzed": 10200,
        "videos_analyzed": 2150,
        "batch_jobs": 45,
        "total_processing_seconds": 892340,
        "total_storage_bytes": 52428800000
      },
      "quota": {
        "plan": "professional",
        "monthly_limit": 50000,
        "used": 12350,
        "remaining": 37650,
        "reset_date": "2026-02-01T00:00:00Z"
      },
      "by_endpoint": [
        {
          "endpoint": "/v1/analyze/image",
          "requests": 10500,
          "success": 10200,
          "failed": 300,
          "avg_latency_ms": 8500
        },
        {
          "endpoint": "/v1/analyze/video",
          "requests": 2200,
          "success": 2150,
          "failed": 50,
          "avg_latency_ms": 45000
        }
      ],
      "by_day": [
        {
          "date": "2026-01-01",
          "requests": 450,
          "analyses": 380
        }
      ],
      "costs": {
        "currency": "USD",
        "total": 245.50,
        "breakdown": {
          "image_analysis": 102.00,
          "video_analysis": 107.50,
          "storage": 26.00,
          "api_calls": 10.00
        }
      }
    }
  }
}
```

### 4.2 Webhook Support

#### 4.2.1 Webhook Registration

**POST /v1/webhooks**

```json
{
  "url": "https://yourapp.com/webhooks/forensivision",
  "events": [
    "analysis.completed",
    "analysis.failed",
    "batch.completed",
    "usage.threshold"
  ],
  "secret": "whsec_your_secret_key",
  "metadata": {
    "environment": "production"
  }
}
```

#### 4.2.2 Webhook Events

| Event | Description |
|-------|-------------|
| `analysis.created` | Analysis job created |
| `analysis.processing` | Analysis started processing |
| `analysis.progress` | Progress update (video only) |
| `analysis.completed` | Analysis completed successfully |
| `analysis.failed` | Analysis failed |
| `batch.item_completed` | Batch item completed |
| `batch.completed` | Entire batch completed |
| `batch.failed` | Batch failed |
| `usage.threshold` | Usage threshold reached (75%, 90%, 100%) |

#### 4.2.3 Webhook Payload

```json
{
  "id": "evt_abc123def456",
  "type": "analysis.completed",
  "created_at": "2026-02-02T10:30:45Z",
  "data": {
    "analysis_id": "analysis_img_abc123",
    "status": "completed",
    "verdict": "ai_generated",
    "confidence": 0.94,
    "results_url": "/v1/results/analysis_img_abc123"
  },
  "metadata": {
    "external_id": "your-internal-id-123"
  }
}
```

#### 4.2.4 Webhook Signature Verification

```http
POST /webhooks/forensivision HTTP/1.1
Host: yourapp.com
Content-Type: application/json
X-ForensiVision-Signature: t=1706875845,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
X-ForensiVision-Event: analysis.completed
X-ForensiVision-Delivery: dlv_xyz789

{...payload...}
```

**Signature Verification (Python):**

```python
import hmac
import hashlib
import time

def verify_webhook_signature(payload: bytes, signature_header: str, secret: str) -> bool:
    """Verify ForensiVision webhook signature."""
    # Parse signature header
    parts = dict(part.split('=') for part in signature_header.split(','))
    timestamp = parts.get('t')
    signature = parts.get('v1')

    if not timestamp or not signature:
        return False

    # Check timestamp freshness (5 minute tolerance)
    if abs(time.time() - int(timestamp)) > 300:
        return False

    # Compute expected signature
    signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        signed_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)
```

#### 4.2.5 Webhook Retry Policy

| Attempt | Delay | Cumulative |
|---------|-------|------------|
| 1 | Immediate | 0s |
| 2 | 1 minute | 1m |
| 3 | 5 minutes | 6m |
| 4 | 30 minutes | 36m |
| 5 | 2 hours | 2h 36m |
| 6 | 8 hours | 10h 36m |
| 7 | 24 hours | 34h 36m |

After 7 failed attempts, the webhook is marked as failed and an email notification is sent.

### 4.3 Additional Endpoints

#### 4.3.1 Analysis Management

```http
# Cancel an analysis
POST /v1/analysis/{id}/cancel

# Get analysis status
GET /v1/analysis/{id}

# List analyses
GET /v1/analyses?status=completed&limit=20

# Delete analysis and results
DELETE /v1/analysis/{id}
```

#### 4.3.2 Model Information

```http
# List available models
GET /v1/models

# Get model details
GET /v1/models/{model_id}
```

**Response:**

```json
{
  "data": [
    {
      "id": "deepfake_v3",
      "name": "DeepFake Detector v3",
      "version": "3.2.1",
      "type": "image",
      "capabilities": ["face_manipulation", "full_synthetic", "partial_edit"],
      "performance": {
        "accuracy": 0.94,
        "precision": 0.93,
        "recall": 0.95,
        "f1_score": 0.94
      },
      "avg_processing_time_ms": 2500,
      "supported_formats": ["jpeg", "png", "webp", "bmp"],
      "max_resolution": "8192x8192"
    }
  ]
}
```

---

## 5. Processing Pipeline

### 5.1 File Upload Handling

#### 5.1.1 Upload Flow Options

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UPLOAD STRATEGIES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Option A: Direct Multipart Upload (files < 10MB)                           │
│  ┌──────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐ │
│  │  Client  │────▶│  API Gateway │────▶│ Storage Svc  │────▶│  S3/MinIO   │ │
│  └──────────┘     └─────────────┘     └──────────────┘     └─────────────┘ │
│                                                                              │
│  Option B: Presigned URL Upload (files > 10MB)                              │
│  ┌──────────┐     ┌─────────────┐     ┌──────────────┐                      │
│  │  Client  │────▶│  API Gateway │────▶│ Storage Svc  │                      │
│  └──────────┘     └─────────────┘     └──────────────┘                      │
│       │                                      │                               │
│       │                              ┌───────▼───────┐                       │
│       │                              │ Presigned URL │                       │
│       │                              └───────┬───────┘                       │
│       │                                      │                               │
│       │         ┌─────────────┐              │                               │
│       └────────▶│  S3/MinIO   │◀─────────────┘                               │
│                 └─────────────┘                                              │
│                                                                              │
│  Option C: URL Fetch (external URLs)                                        │
│  ┌──────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐ │
│  │  Client  │────▶│  API Gateway │────▶│  Fetch Svc   │────▶│ External URL│ │
│  └──────────┘     └─────────────┘     └──────────────┘     └─────────────┘ │
│                                               │                              │
│                                       ┌───────▼───────┐                      │
│                                       │   S3/MinIO    │                      │
│                                       └───────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.1.2 File Validation Pipeline

```python
class FileValidationPipeline:
    """Validates uploaded files before processing."""

    ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'}
    ALLOWED_VIDEO_TYPES = {'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'}

    MAX_IMAGE_SIZE = 50 * 1024 * 1024  # 50MB
    MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024  # 2GB

    async def validate(self, file_path: str, declared_type: str) -> ValidationResult:
        """Run full validation pipeline."""

        # 1. Magic byte verification
        detected_type = await self.detect_mime_type(file_path)
        if detected_type != declared_type:
            raise ValidationError("MIME_TYPE_MISMATCH",
                f"Declared {declared_type}, detected {detected_type}")

        # 2. File size check
        size = await self.get_file_size(file_path)
        max_size = self.MAX_IMAGE_SIZE if 'image' in detected_type else self.MAX_VIDEO_SIZE
        if size > max_size:
            raise ValidationError("FILE_TOO_LARGE",
                f"File size {size} exceeds maximum {max_size}")

        # 3. Malware scan
        scan_result = await self.scan_for_malware(file_path)
        if scan_result.is_malicious:
            raise ValidationError("MALWARE_DETECTED", scan_result.threat_name)

        # 4. Content verification (can we actually decode it?)
        if 'image' in detected_type:
            metadata = await self.extract_image_metadata(file_path)
        else:
            metadata = await self.extract_video_metadata(file_path)

        # 5. Dimension/duration limits
        if 'image' in detected_type:
            if metadata.width > 8192 or metadata.height > 8192:
                raise ValidationError("DIMENSIONS_EXCEEDED",
                    "Maximum supported resolution is 8192x8192")
        else:
            if metadata.duration_seconds > 3600:
                raise ValidationError("DURATION_EXCEEDED",
                    "Maximum supported video duration is 1 hour")

        return ValidationResult(
            valid=True,
            file_type=detected_type,
            size=size,
            metadata=metadata
        )
```

### 5.2 Queue Management

#### 5.2.1 Queue Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MESSAGE QUEUE ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      EXCHANGE: analysis.direct                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│          │                    │                    │                         │
│          ▼                    ▼                    ▼                         │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐                  │
│  │ Queue:        │   │ Queue:        │   │ Queue:        │                  │
│  │ analysis.     │   │ analysis.     │   │ analysis.     │                  │
│  │ image.high    │   │ image.normal  │   │ image.low     │                  │
│  │               │   │               │   │               │                  │
│  │ Priority: 10  │   │ Priority: 5   │   │ Priority: 1   │                  │
│  │ Workers: 20   │   │ Workers: 50   │   │ Workers: 10   │                  │
│  └───────┬───────┘   └───────┬───────┘   └───────┬───────┘                  │
│          │                   │                   │                           │
│          └───────────────────┼───────────────────┘                           │
│                              ▼                                               │
│                   ┌─────────────────────┐                                    │
│                   │  DLX: analysis.dlx  │                                    │
│                   │                     │                                    │
│                   │  - Failed jobs      │                                    │
│                   │  - Manual review    │                                    │
│                   │  - Retry scheduler  │                                    │
│                   └─────────────────────┘                                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      EXCHANGE: analysis.video                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│          │                    │                                              │
│          ▼                    ▼                                              │
│  ┌───────────────┐   ┌───────────────┐                                      │
│  │ Queue:        │   │ Queue:        │                                      │
│  │ analysis.     │   │ analysis.     │                                      │
│  │ video.short   │   │ video.long    │                                      │
│  │               │   │               │                                      │
│  │ < 60 seconds  │   │ >= 60 seconds │                                      │
│  │ Workers: 10   │   │ Workers: 5    │                                      │
│  └───────────────┘   └───────────────┘                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.2.2 Job Message Schema

```json
{
  "job_id": "analysis_img_abc123",
  "type": "image_analysis",
  "priority": 5,
  "created_at": "2026-02-02T10:30:00Z",
  "timeout_at": "2026-02-02T11:30:00Z",
  "retry_count": 0,
  "max_retries": 3,
  "payload": {
    "file_key": "uploads/2026/02/02/abc123.jpg",
    "file_hash": "sha256:a1b2c3d4...",
    "models": ["deepfake_v3", "gan_detector_v2"],
    "options": {
      "detail_level": "comprehensive",
      "include_heatmap": true
    }
  },
  "routing": {
    "user_id": "user_xyz789",
    "org_id": "org_def456",
    "tier": "professional"
  },
  "callback": {
    "webhook_url": "https://yourapp.com/webhooks",
    "internal_callback": "results.completed"
  }
}
```

### 5.3 Worker Architecture

#### 5.3.1 ML Worker Design

```python
import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Any, List
import torch

@dataclass
class InferenceResult:
    model_id: str
    model_version: str
    verdict: str
    confidence: float
    details: Dict[str, Any]
    execution_time_ms: int
    gpu_memory_used_mb: int

class BaseMLWorker(ABC):
    """Base class for ML inference workers."""

    def __init__(self, config: WorkerConfig):
        self.config = config
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.models: Dict[str, torch.nn.Module] = {}
        self.model_versions: Dict[str, str] = {}

    async def initialize(self):
        """Load models into memory/GPU."""
        for model_id in self.config.models:
            model, version = await self.load_model(model_id)
            self.models[model_id] = model.to(self.device)
            self.model_versions[model_id] = version

    @abstractmethod
    async def load_model(self, model_id: str) -> tuple:
        """Load a specific model."""
        pass

    @abstractmethod
    async def preprocess(self, file_path: str) -> torch.Tensor:
        """Preprocess input file for inference."""
        pass

    @abstractmethod
    async def postprocess(self, output: torch.Tensor, model_id: str) -> InferenceResult:
        """Convert model output to result."""
        pass

    async def run_inference(self, job: AnalysisJob) -> List[InferenceResult]:
        """Execute inference for all requested models."""
        results = []

        # Download file from S3
        file_path = await self.download_file(job.payload.file_key)

        try:
            # Preprocess
            input_tensor = await self.preprocess(file_path)
            input_tensor = input_tensor.to(self.device)

            # Run each model
            for model_id in job.payload.models:
                if model_id not in self.models:
                    continue

                start_time = time.time()

                with torch.no_grad():
                    output = self.models[model_id](input_tensor)

                execution_time = int((time.time() - start_time) * 1000)

                result = await self.postprocess(output, model_id)
                result.execution_time_ms = execution_time
                results.append(result)

        finally:
            # Cleanup temp file
            await self.cleanup_file(file_path)

        return results


class ImageAnalysisWorker(BaseMLWorker):
    """Worker for image analysis tasks."""

    async def load_model(self, model_id: str) -> tuple:
        model_path = f"/models/{model_id}/model.pt"
        version_path = f"/models/{model_id}/version.txt"

        model = torch.jit.load(model_path)
        with open(version_path) as f:
            version = f.read().strip()

        return model, version

    async def preprocess(self, file_path: str) -> torch.Tensor:
        from PIL import Image
        from torchvision import transforms

        transform = transforms.Compose([
            transforms.Resize((384, 384)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

        image = Image.open(file_path).convert('RGB')
        return transform(image).unsqueeze(0)

    async def postprocess(self, output: torch.Tensor, model_id: str) -> InferenceResult:
        probabilities = torch.softmax(output, dim=1)
        confidence = probabilities[0][1].item()  # AI-generated class

        verdict = "ai_generated" if confidence > 0.5 else "authentic"

        return InferenceResult(
            model_id=model_id,
            model_version=self.model_versions[model_id],
            verdict=verdict,
            confidence=confidence,
            details={
                "raw_scores": output.tolist(),
                "class_probabilities": probabilities.tolist()
            },
            execution_time_ms=0,
            gpu_memory_used_mb=torch.cuda.memory_allocated() // (1024 * 1024)
        )
```

#### 5.3.2 Video Processing Pipeline

```python
class VideoAnalysisWorker(BaseMLWorker):
    """Worker for video analysis tasks."""

    async def process_video(self, job: AnalysisJob) -> VideoAnalysisResult:
        """Process video through multi-stage pipeline."""

        file_path = await self.download_file(job.payload.file_key)

        try:
            # Stage 1: Extract metadata and frames
            metadata = await self.extract_metadata(file_path)
            frames = await self.extract_frames(
                file_path,
                sampling_strategy=job.payload.options.frame_sampling
            )

            await self.update_progress(job.job_id, 20, "frame_extraction")

            # Stage 2: Face detection and tracking
            face_tracks = await self.detect_and_track_faces(frames)
            await self.update_progress(job.job_id, 35, "face_detection")

            # Stage 3: Per-frame deepfake analysis
            frame_results = await self.analyze_frames(frames, face_tracks)
            await self.update_progress(job.job_id, 60, "deepfake_analysis")

            # Stage 4: Audio analysis (if enabled)
            audio_result = None
            if job.payload.options.audio_analysis:
                audio_path = await self.extract_audio(file_path)
                audio_result = await self.analyze_audio(audio_path, face_tracks)
            await self.update_progress(job.job_id, 75, "audio_analysis")

            # Stage 5: Temporal consistency analysis
            temporal_result = await self.analyze_temporal_consistency(
                frame_results,
                face_tracks
            )
            await self.update_progress(job.job_id, 90, "temporal_analysis")

            # Stage 6: Aggregate results
            final_result = await self.aggregate_results(
                frame_results,
                audio_result,
                temporal_result,
                metadata
            )
            await self.update_progress(job.job_id, 100, "completed")

            return final_result

        finally:
            await self.cleanup_file(file_path)

    async def extract_frames(
        self,
        video_path: str,
        sampling_strategy: FrameSamplingConfig
    ) -> List[Frame]:
        """Extract frames based on sampling strategy."""

        import cv2

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps

        if sampling_strategy.strategy == "adaptive":
            # More frames during scene changes
            sample_indices = await self.get_adaptive_sample_indices(
                video_path,
                sampling_strategy.min_fps,
                sampling_strategy.max_fps
            )
        elif sampling_strategy.strategy == "uniform":
            # Fixed FPS sampling
            interval = int(fps / sampling_strategy.target_fps)
            sample_indices = list(range(0, total_frames, interval))
        else:  # keyframe
            sample_indices = await self.get_keyframe_indices(video_path)

        frames = []
        for idx in sample_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if ret:
                frames.append(Frame(
                    index=idx,
                    timestamp=idx / fps,
                    data=frame
                ))

        cap.release()
        return frames
```

### 5.4 Result Storage and Retrieval

#### 5.4.1 Result Storage Schema

```sql
-- Analysis jobs table
CREATE TABLE analysis_jobs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    org_id VARCHAR(64),
    type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 5,

    -- File information
    file_key VARCHAR(512) NOT NULL,
    file_name VARCHAR(255),
    file_size_bytes BIGINT,
    file_hash VARCHAR(128),
    mime_type VARCHAR(128),

    -- Processing metadata
    models JSONB,
    options JSONB,

    -- Webhook configuration
    webhook_url VARCHAR(2048),
    webhook_secret VARCHAR(256),

    -- User metadata
    external_id VARCHAR(256),
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Error tracking
    error_code VARCHAR(64),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Indexes
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_jobs_user_id ON analysis_jobs(user_id);
CREATE INDEX idx_jobs_org_id ON analysis_jobs(org_id);
CREATE INDEX idx_jobs_status ON analysis_jobs(status);
CREATE INDEX idx_jobs_created_at ON analysis_jobs(created_at DESC);
CREATE INDEX idx_jobs_external_id ON analysis_jobs(external_id);

-- Analysis results table
CREATE TABLE analysis_results (
    id VARCHAR(64) PRIMARY KEY,
    job_id VARCHAR(64) NOT NULL REFERENCES analysis_jobs(id),

    -- Overall verdict
    verdict VARCHAR(32) NOT NULL,
    confidence DECIMAL(5, 4) NOT NULL,
    risk_level VARCHAR(32),

    -- Detailed results (stored as JSONB for flexibility)
    detections JSONB NOT NULL,
    ensemble_result JSONB,
    explanation JSONB,

    -- Media-specific results
    heatmap_url VARCHAR(2048),
    timeline_data JSONB,  -- For video

    -- File metadata extracted during analysis
    file_metadata JSONB,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Full-text search
    search_vector TSVECTOR
);

CREATE INDEX idx_results_job_id ON analysis_results(job_id);
CREATE INDEX idx_results_verdict ON analysis_results(verdict);
CREATE INDEX idx_results_confidence ON analysis_results(confidence);
CREATE INDEX idx_results_search ON analysis_results USING GIN(search_vector);

-- Model execution logs
CREATE TABLE model_executions (
    id SERIAL PRIMARY KEY,
    result_id VARCHAR(64) NOT NULL REFERENCES analysis_results(id),
    model_id VARCHAR(64) NOT NULL,
    model_version VARCHAR(32) NOT NULL,

    verdict VARCHAR(32) NOT NULL,
    confidence DECIMAL(5, 4) NOT NULL,
    raw_output JSONB,

    execution_time_ms INTEGER,
    gpu_memory_mb INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_executions_result_id ON model_executions(result_id);
CREATE INDEX idx_executions_model_id ON model_executions(model_id);
```

#### 5.4.2 Result Caching Strategy

```python
class ResultCacheService:
    """Manages result caching with Redis."""

    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.default_ttl = 3600  # 1 hour

    async def get_result(self, result_id: str) -> Optional[AnalysisResult]:
        """Retrieve result from cache."""
        key = f"result:{result_id}"
        cached = await self.redis.get(key)

        if cached:
            return AnalysisResult.parse_raw(cached)
        return None

    async def cache_result(
        self,
        result: AnalysisResult,
        ttl: Optional[int] = None
    ):
        """Cache a result with appropriate TTL."""
        key = f"result:{result.id}"
        ttl = ttl or self.default_ttl

        # Adjust TTL based on result type
        if result.verdict == "ai_generated" and result.confidence > 0.9:
            # High-confidence results cached longer
            ttl = 86400  # 24 hours

        await self.redis.setex(key, ttl, result.json())

        # Also cache by file hash for deduplication
        if result.file_hash:
            hash_key = f"result:hash:{result.file_hash}"
            await self.redis.setex(hash_key, ttl, result.id)

    async def get_by_file_hash(self, file_hash: str) -> Optional[str]:
        """Check if we've analyzed this exact file before."""
        hash_key = f"result:hash:{file_hash}"
        return await self.redis.get(hash_key)
```

---

## 6. Scalability Considerations

### 6.1 Horizontal Scaling Strategy

#### 6.1.1 Service Scaling Matrix

| Service | Scaling Trigger | Min Replicas | Max Replicas | Scale Metric |
|---------|-----------------|--------------|--------------|--------------|
| API Gateway | CPU > 60% | 3 | 20 | CPU, Request rate |
| Auth Service | CPU > 70% | 2 | 10 | CPU, Auth req/s |
| Analysis Service | Queue depth > 100 | 3 | 30 | Queue depth |
| Storage Service | CPU > 60% | 2 | 15 | CPU, Upload rate |
| Results Service | CPU > 70% | 2 | 10 | CPU, Query rate |
| Webhook Service | Queue depth > 50 | 2 | 10 | Queue depth |
| Image Worker | Queue depth > 20 | 5 | 100 | Queue depth, GPU util |
| Video Worker | Queue depth > 5 | 2 | 30 | Queue depth, GPU util |

#### 6.1.2 Kubernetes HPA Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: image-worker-hpa
  namespace: forensivision
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: image-worker
  minReplicas: 5
  maxReplicas: 100
  metrics:
    # Scale on queue depth (custom metric from RabbitMQ)
    - type: External
      external:
        metric:
          name: rabbitmq_queue_messages
          selector:
            matchLabels:
              queue: analysis.image
        target:
          type: AverageValue
          averageValue: "20"
    # Also consider GPU utilization
    - type: Pods
      pods:
        metric:
          name: gpu_utilization
        target:
          type: AverageValue
          averageValue: "70"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 10
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
```

### 6.2 GPU Resource Management

#### 6.2.1 GPU Node Pool Configuration

```yaml
# GKE GPU Node Pool
apiVersion: container.google.com/v1
kind: NodePool
metadata:
  name: gpu-pool-nvidia-t4
spec:
  cluster: forensivision-prod
  locations:
    - us-central1-a
    - us-central1-b
  autoscaling:
    enabled: true
    minNodeCount: 2
    maxNodeCount: 50
  config:
    machineType: n1-standard-8
    accelerators:
      - acceleratorType: nvidia-tesla-t4
        acceleratorCount: 1
    taints:
      - key: nvidia.com/gpu
        value: "true"
        effect: NoSchedule
---
# High-performance pool for video processing
apiVersion: container.google.com/v1
kind: NodePool
metadata:
  name: gpu-pool-nvidia-a100
spec:
  cluster: forensivision-prod
  locations:
    - us-central1-a
  autoscaling:
    enabled: true
    minNodeCount: 1
    maxNodeCount: 10
  config:
    machineType: a2-highgpu-1g
    accelerators:
      - acceleratorType: nvidia-tesla-a100
        acceleratorCount: 1
    taints:
      - key: nvidia.com/gpu
        value: "a100"
        effect: NoSchedule
```

#### 6.2.2 GPU Scheduling Strategy

```yaml
# Image worker deployment with GPU scheduling
apiVersion: apps/v1
kind: Deployment
metadata:
  name: image-worker
  namespace: forensivision
spec:
  replicas: 10
  selector:
    matchLabels:
      app: image-worker
  template:
    metadata:
      labels:
        app: image-worker
    spec:
      tolerations:
        - key: nvidia.com/gpu
          operator: Equal
          value: "true"
          effect: NoSchedule
      containers:
        - name: worker
          image: forensivision/image-worker:v3.2.1
          resources:
            requests:
              memory: "8Gi"
              cpu: "2"
              nvidia.com/gpu: "1"
            limits:
              memory: "16Gi"
              cpu: "4"
              nvidia.com/gpu: "1"
          env:
            - name: CUDA_VISIBLE_DEVICES
              value: "0"
            - name: MODEL_BATCH_SIZE
              value: "8"
          volumeMounts:
            - name: model-cache
              mountPath: /models
            - name: dshm
              mountPath: /dev/shm
      volumes:
        - name: model-cache
          persistentVolumeClaim:
            claimName: model-cache-pvc
        - name: dshm
          emptyDir:
            medium: Memory
            sizeLimit: 8Gi
```

### 6.3 Caching Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CACHING ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Layer 1: CDN Cache (CloudFlare/CloudFront)                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • Static assets (heatmaps, thumbnails)                              │    │
│  │  • TTL: 24 hours                                                     │    │
│  │  • Cache key: URL + Accept header                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 2: API Response Cache (Redis)                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • GET /results/{id} responses                                       │    │
│  │  • GET /models responses                                             │    │
│  │  • TTL: 1-24 hours based on volatility                               │    │
│  │  • Cache invalidation on result update                               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 3: Session/Auth Cache (Redis)                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • JWT validation results                                            │    │
│  │  • API key lookups                                                   │    │
│  │  • Rate limit counters                                               │    │
│  │  • TTL: 5-15 minutes                                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 4: ML Model Cache (GPU Memory + Disk)                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • Loaded model weights in GPU memory                                │    │
│  │  • Model files on NVMe SSD                                           │    │
│  │  • Warmup on pod startup                                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 5: File Hash Deduplication (Redis)                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • SHA-256 hash → result_id mapping                                  │    │
│  │  • Skip re-analysis of identical files                               │    │
│  │  • TTL: 7 days                                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Cache Configuration

```yaml
# Redis Cluster Configuration
redis:
  cluster:
    enabled: true
    nodes: 6
    replicas: 1

  # Separate Redis instances for different use cases
  instances:
    - name: cache
      maxmemory: 16gb
      maxmemory-policy: allkeys-lru

    - name: sessions
      maxmemory: 4gb
      maxmemory-policy: volatile-lru

    - name: rate-limits
      maxmemory: 2gb
      maxmemory-policy: volatile-ttl
```

### 6.4 Database Architecture

#### 6.4.1 PostgreSQL Configuration

```yaml
# PostgreSQL with read replicas
postgresql:
  primary:
    instance_type: db.r6g.2xlarge
    storage: 1TB gp3
    iops: 12000

  replicas:
    count: 3
    instance_type: db.r6g.xlarge

  connection_pooling:
    enabled: true
    pool_mode: transaction
    max_client_connections: 10000
    default_pool_size: 100

  configuration:
    max_connections: 500
    shared_buffers: 8GB
    effective_cache_size: 24GB
    work_mem: 256MB
    maintenance_work_mem: 2GB
    random_page_cost: 1.1
    effective_io_concurrency: 200

    # Write-ahead log
    wal_level: replica
    max_wal_senders: 10
    wal_keep_size: 5GB
```

#### 6.4.2 Read/Write Splitting

```python
class DatabaseRouter:
    """Routes queries to appropriate database instance."""

    def __init__(self, primary_url: str, replica_urls: List[str]):
        self.primary = create_engine(primary_url)
        self.replicas = [create_engine(url) for url in replica_urls]
        self.replica_index = 0

    def get_engine(self, operation: str) -> Engine:
        """Get appropriate database engine for operation."""
        if operation in ('INSERT', 'UPDATE', 'DELETE'):
            return self.primary
        else:
            # Round-robin across replicas
            engine = self.replicas[self.replica_index]
            self.replica_index = (self.replica_index + 1) % len(self.replicas)
            return engine
```

---

## 7. Error Handling

### 7.1 Error Code Taxonomy

#### 7.1.1 Error Categories

| Category | Code Range | HTTP Status | Description |
|----------|------------|-------------|-------------|
| Authentication | 1000-1099 | 401, 403 | Auth failures |
| Validation | 2000-2099 | 400 | Invalid input |
| Rate Limiting | 3000-3099 | 429 | Rate limits |
| Resource | 4000-4099 | 404, 410 | Not found/gone |
| Processing | 5000-5099 | 422 | Processing failures |
| Server | 6000-6099 | 500, 502, 503 | Server errors |
| External | 7000-7099 | 502 | External service failures |

#### 7.1.2 Detailed Error Codes

```typescript
// Error Code Reference
const ERROR_CODES = {
  // Authentication Errors (1000-1099)
  AUTH_MISSING_CREDENTIALS: {
    code: 1001,
    message: "Authentication credentials were not provided.",
    http_status: 401
  },
  AUTH_INVALID_API_KEY: {
    code: 1002,
    message: "The provided API key is invalid or has been revoked.",
    http_status: 401
  },
  AUTH_EXPIRED_TOKEN: {
    code: 1003,
    message: "The authentication token has expired.",
    http_status: 401
  },
  AUTH_INSUFFICIENT_SCOPE: {
    code: 1004,
    message: "The provided credentials lack the required scope for this operation.",
    http_status: 403
  },
  AUTH_ACCOUNT_SUSPENDED: {
    code: 1005,
    message: "This account has been suspended. Please contact support.",
    http_status: 403
  },

  // Validation Errors (2000-2099)
  VALIDATION_INVALID_JSON: {
    code: 2001,
    message: "The request body is not valid JSON.",
    http_status: 400
  },
  VALIDATION_MISSING_FIELD: {
    code: 2002,
    message: "A required field is missing from the request.",
    http_status: 400
  },
  VALIDATION_INVALID_FIELD: {
    code: 2003,
    message: "A field value is invalid.",
    http_status: 400
  },
  VALIDATION_FILE_TOO_LARGE: {
    code: 2010,
    message: "The uploaded file exceeds the maximum allowed size.",
    http_status: 400
  },
  VALIDATION_UNSUPPORTED_FORMAT: {
    code: 2011,
    message: "The file format is not supported.",
    http_status: 400
  },
  VALIDATION_CORRUPT_FILE: {
    code: 2012,
    message: "The uploaded file appears to be corrupt or unreadable.",
    http_status: 400
  },
  VALIDATION_URL_UNREACHABLE: {
    code: 2013,
    message: "The provided URL could not be reached.",
    http_status: 400
  },

  // Rate Limiting Errors (3000-3099)
  RATE_LIMIT_EXCEEDED: {
    code: 3001,
    message: "Rate limit exceeded. Please retry after the specified time.",
    http_status: 429
  },
  RATE_LIMIT_CONCURRENT: {
    code: 3002,
    message: "Maximum concurrent requests exceeded.",
    http_status: 429
  },
  QUOTA_EXCEEDED: {
    code: 3003,
    message: "Monthly quota exceeded. Please upgrade your plan.",
    http_status: 429
  },

  // Resource Errors (4000-4099)
  RESOURCE_NOT_FOUND: {
    code: 4001,
    message: "The requested resource was not found.",
    http_status: 404
  },
  ANALYSIS_NOT_FOUND: {
    code: 4002,
    message: "The specified analysis job was not found.",
    http_status: 404
  },
  RESULT_NOT_FOUND: {
    code: 4003,
    message: "The analysis result was not found.",
    http_status: 404
  },
  RESOURCE_DELETED: {
    code: 4010,
    message: "This resource has been deleted.",
    http_status: 410
  },

  // Processing Errors (5000-5099)
  PROCESSING_FAILED: {
    code: 5001,
    message: "The analysis processing failed.",
    http_status: 422
  },
  PROCESSING_TIMEOUT: {
    code: 5002,
    message: "The analysis timed out.",
    http_status: 422
  },
  PROCESSING_MODEL_ERROR: {
    code: 5003,
    message: "An ML model encountered an error during inference.",
    http_status: 422
  },
  PROCESSING_CANCELLED: {
    code: 5004,
    message: "The analysis was cancelled.",
    http_status: 422
  },
  PROCESSING_MALWARE_DETECTED: {
    code: 5010,
    message: "The file was flagged as potentially malicious.",
    http_status: 422
  },

  // Server Errors (6000-6099)
  SERVER_INTERNAL_ERROR: {
    code: 6001,
    message: "An internal server error occurred.",
    http_status: 500
  },
  SERVER_OVERLOADED: {
    code: 6002,
    message: "The server is currently overloaded. Please retry later.",
    http_status: 503
  },
  SERVER_MAINTENANCE: {
    code: 6003,
    message: "The service is under maintenance.",
    http_status: 503
  },

  // External Service Errors (7000-7099)
  EXTERNAL_STORAGE_ERROR: {
    code: 7001,
    message: "Failed to communicate with storage service.",
    http_status: 502
  },
  EXTERNAL_ML_SERVICE_ERROR: {
    code: 7002,
    message: "ML inference service is unavailable.",
    http_status: 502
  }
};
```

### 7.2 Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_FILE_TOO_LARGE",
    "numeric_code": 2010,
    "message": "The uploaded file exceeds the maximum allowed size.",
    "type": "validation_error",
    "details": {
      "field": "file",
      "max_size_bytes": 52428800,
      "actual_size_bytes": 104857600,
      "suggestion": "Compress the file or split into smaller segments"
    },
    "documentation_url": "https://docs.forensivision.com/errors/2010",
    "support_url": "https://support.forensivision.com"
  },
  "request_id": "req_abc123def456",
  "timestamp": "2026-02-02T10:30:00Z"
}
```

### 7.3 Retry Strategies

#### 7.3.1 Client-Side Retry Policy

```python
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)

class RetryableError(Exception):
    """Errors that should trigger a retry."""
    pass

class ForensiVisionClient:
    """API client with retry logic."""

    RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=1, max=60),
        retry=retry_if_exception_type(RetryableError)
    )
    async def make_request(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> Response:
        """Make an API request with automatic retry."""

        response = await self.session.request(method, endpoint, **kwargs)

        if response.status_code in self.RETRYABLE_STATUS_CODES:
            # Check for Retry-After header
            retry_after = response.headers.get('Retry-After')
            if retry_after:
                await asyncio.sleep(int(retry_after))
            raise RetryableError(f"Retryable status: {response.status_code}")

        return response
```

#### 7.3.2 Server-Side Job Retry

```python
class JobRetryPolicy:
    """Defines retry behavior for failed jobs."""

    DEFAULT_MAX_RETRIES = 3

    RETRY_DELAYS = {
        1: 60,      # 1 minute
        2: 300,     # 5 minutes
        3: 900,     # 15 minutes
    }

    NON_RETRYABLE_ERRORS = {
        'VALIDATION_UNSUPPORTED_FORMAT',
        'VALIDATION_CORRUPT_FILE',
        'PROCESSING_MALWARE_DETECTED',
        'AUTH_ACCOUNT_SUSPENDED',
    }

    def should_retry(self, job: AnalysisJob, error: ProcessingError) -> bool:
        """Determine if a job should be retried."""

        # Check if error is retryable
        if error.code in self.NON_RETRYABLE_ERRORS:
            return False

        # Check retry count
        if job.retry_count >= self.DEFAULT_MAX_RETRIES:
            return False

        return True

    def get_retry_delay(self, job: AnalysisJob) -> int:
        """Get delay before next retry attempt."""
        return self.RETRY_DELAYS.get(
            job.retry_count + 1,
            self.RETRY_DELAYS[3]
        )

    async def schedule_retry(self, job: AnalysisJob, error: ProcessingError):
        """Schedule a job retry."""

        if not self.should_retry(job, error):
            await self.mark_permanently_failed(job, error)
            return

        delay = self.get_retry_delay(job)

        # Update job
        job.retry_count += 1
        job.status = 'pending'
        job.error_message = f"Retry {job.retry_count}: {error.message}"

        # Reschedule with delay
        await self.queue.publish(
            job.to_message(),
            delay_seconds=delay,
            routing_key=job.get_routing_key()
        )
```

### 7.4 Circuit Breaker Pattern

```python
from enum import Enum
from dataclasses import dataclass
from datetime import datetime, timedelta
import asyncio

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered

@dataclass
class CircuitBreakerConfig:
    failure_threshold: int = 5
    success_threshold: int = 3
    timeout_seconds: int = 60
    half_open_max_calls: int = 3

class CircuitBreaker:
    """Circuit breaker for external service calls."""

    def __init__(self, name: str, config: CircuitBreakerConfig):
        self.name = name
        self.config = config
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.half_open_calls = 0
        self._lock = asyncio.Lock()

    async def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection."""

        async with self._lock:
            if self.state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self.state = CircuitState.HALF_OPEN
                    self.half_open_calls = 0
                else:
                    raise CircuitOpenError(
                        f"Circuit {self.name} is OPEN. "
                        f"Retry after {self._time_until_reset()} seconds."
                    )

            if self.state == CircuitState.HALF_OPEN:
                if self.half_open_calls >= self.config.half_open_max_calls:
                    raise CircuitOpenError(
                        f"Circuit {self.name} is HALF_OPEN and at capacity."
                    )
                self.half_open_calls += 1

        try:
            result = await func(*args, **kwargs)
            await self._on_success()
            return result
        except Exception as e:
            await self._on_failure()
            raise

    async def _on_success(self):
        async with self._lock:
            if self.state == CircuitState.HALF_OPEN:
                self.success_count += 1
                if self.success_count >= self.config.success_threshold:
                    self._reset()
            else:
                self.failure_count = 0

    async def _on_failure(self):
        async with self._lock:
            self.failure_count += 1
            self.last_failure_time = datetime.utcnow()

            if self.state == CircuitState.HALF_OPEN:
                self._trip()
            elif self.failure_count >= self.config.failure_threshold:
                self._trip()

    def _trip(self):
        """Open the circuit."""
        self.state = CircuitState.OPEN
        self.success_count = 0

    def _reset(self):
        """Close the circuit."""
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0

    def _should_attempt_reset(self) -> bool:
        if not self.last_failure_time:
            return True
        return datetime.utcnow() > (
            self.last_failure_time +
            timedelta(seconds=self.config.timeout_seconds)
        )


# Usage example
ml_service_breaker = CircuitBreaker(
    "ml_inference_service",
    CircuitBreakerConfig(
        failure_threshold=5,
        success_threshold=3,
        timeout_seconds=30
    )
)

async def analyze_image(image_data: bytes) -> AnalysisResult:
    return await ml_service_breaker.call(
        ml_inference_client.analyze,
        image_data
    )
```

---

## 8. Security Architecture

### 8.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Layer 1: Edge Security (CDN/WAF)                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • DDoS protection                                                   │    │
│  │  • WAF rules (OWASP Top 10)                                          │    │
│  │  • Bot detection                                                     │    │
│  │  • Geo-blocking (if required)                                        │    │
│  │  • TLS 1.3 enforcement                                               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 2: API Gateway Security                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • API key validation                                                │    │
│  │  • Rate limiting                                                     │    │
│  │  • Request size limits                                               │    │
│  │  • Input sanitization                                                │    │
│  │  • CORS enforcement                                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 3: Application Security                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • JWT validation                                                    │    │
│  │  • RBAC enforcement                                                  │    │
│  │  • Input validation (Pydantic/JSON Schema)                          │    │
│  │  • SQL injection prevention (parameterized queries)                 │    │
│  │  • File type verification (magic bytes)                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 4: Data Security                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • Encryption at rest (AES-256)                                      │    │
│  │  • Encryption in transit (TLS 1.3)                                   │    │
│  │  • Database field encryption (PII)                                   │    │
│  │  • Secrets management (AWS Secrets Manager / HashiCorp Vault)       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Layer 5: Infrastructure Security                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • VPC isolation                                                     │    │
│  │  • Network policies (Kubernetes)                                     │    │
│  │  • Service mesh (mTLS between services)                             │    │
│  │  • Pod security policies                                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 API Key Security

```python
import hashlib
import secrets
from datetime import datetime, timedelta

class APIKeyManager:
    """Secure API key generation and validation."""

    PREFIX_MAP = {
        'live': 'fv_live',
        'test': 'fv_test',
        'sandbox': 'fv_sandbox'
    }

    def generate_api_key(
        self,
        user_id: str,
        environment: str,
        key_type: str,  # 'secret' or 'publishable'
        scopes: List[str]
    ) -> Tuple[str, str]:
        """Generate a new API key.

        Returns:
            Tuple of (full_key, key_hash)
            The full_key is shown once; we store only key_hash
        """

        prefix = f"{self.PREFIX_MAP[environment]}_{key_type[0]}k"
        random_part = secrets.token_urlsafe(32)
        full_key = f"{prefix}_{random_part}"

        # Hash for storage
        key_hash = hashlib.sha256(full_key.encode()).hexdigest()

        # Store metadata
        self.store_key_metadata(
            key_hash=key_hash,
            user_id=user_id,
            prefix=prefix,
            scopes=scopes,
            created_at=datetime.utcnow()
        )

        return full_key, key_hash

    def validate_api_key(self, api_key: str) -> Optional[APIKeyInfo]:
        """Validate an API key and return its metadata."""

        # Quick format check
        if not api_key.startswith('fv_'):
            return None

        # Hash the key
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()

        # Lookup in cache first
        cached = self.cache.get(f"apikey:{key_hash}")
        if cached:
            return APIKeyInfo.parse_raw(cached)

        # Database lookup
        key_info = self.db.get_api_key(key_hash)
        if not key_info:
            return None

        # Check if revoked or expired
        if key_info.revoked_at or (
            key_info.expires_at and key_info.expires_at < datetime.utcnow()
        ):
            return None

        # Cache for future requests
        self.cache.setex(
            f"apikey:{key_hash}",
            300,  # 5 minute TTL
            key_info.json()
        )

        return key_info
```

### 8.3 Data Retention & Privacy

```yaml
# Data retention policy
data_retention:
  # Analysis results
  results:
    default_retention_days: 90
    enterprise_retention_days: 365
    compliance_retention_days: 2555  # 7 years for some regulations

  # Uploaded files
  files:
    retention_after_analysis: 24  # hours
    enterprise_retention: 168     # 7 days
    delete_on_user_request: true

  # Audit logs
  audit_logs:
    retention_days: 2555  # 7 years

  # Personal data
  personal_data:
    gdpr_deletion_days: 30
    export_format: json
```

---

## 9. Monitoring & Observability

### 9.1 Metrics Collection

```yaml
# Key metrics to collect
metrics:
  # API metrics
  api:
    - name: http_requests_total
      type: counter
      labels: [method, endpoint, status_code, api_version]

    - name: http_request_duration_seconds
      type: histogram
      labels: [method, endpoint]
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]

    - name: http_request_size_bytes
      type: histogram
      labels: [method, endpoint]

  # Analysis metrics
  analysis:
    - name: analysis_jobs_total
      type: counter
      labels: [type, status, model]

    - name: analysis_duration_seconds
      type: histogram
      labels: [type, model]
      buckets: [1, 5, 10, 30, 60, 120, 300, 600]

    - name: analysis_queue_depth
      type: gauge
      labels: [queue_name, priority]

  # ML metrics
  ml:
    - name: inference_duration_seconds
      type: histogram
      labels: [model_id, model_version]

    - name: gpu_utilization_percent
      type: gauge
      labels: [node, gpu_index]

    - name: model_prediction_confidence
      type: histogram
      labels: [model_id, verdict]
      buckets: [0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99]
```

### 9.2 Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: forensivision-api
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High API error rate (> 5%)"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint)
          ) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency > 5s for {{ $labels.endpoint }}"

      - alert: QueueBacklog
        expr: analysis_queue_depth > 1000
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Analysis queue depth > 1000"

      - alert: GPUUtilizationLow
        expr: gpu_utilization_percent < 20
        for: 30m
        labels:
          severity: info
        annotations:
          summary: "GPU underutilized - consider scaling down"
```

### 9.3 Distributed Tracing

```python
from opentelemetry import trace
from opentelemetry.trace import SpanKind

tracer = trace.get_tracer(__name__)

@tracer.start_as_current_span("analyze_image", kind=SpanKind.SERVER)
async def analyze_image(request: AnalyzeImageRequest) -> AnalysisResult:
    span = trace.get_current_span()
    span.set_attribute("analysis.type", "image")
    span.set_attribute("user.id", request.user_id)

    # File validation span
    with tracer.start_as_current_span("validate_file"):
        await validate_file(request.file)

    # Queue job span
    with tracer.start_as_current_span("queue_job") as queue_span:
        job_id = await queue_analysis_job(request)
        queue_span.set_attribute("job.id", job_id)

    span.set_attribute("job.id", job_id)
    return AnalysisResult(job_id=job_id, status="processing")
```

---

## 10. Appendices

### 10.1 OpenAPI Specification

The complete OpenAPI 3.1 specification is available at:
- **Production**: https://api.forensivision.com/v1/openapi.json
- **Documentation**: https://docs.forensivision.com/api

### 10.2 SDK Libraries

Official SDKs will be provided for:
- Python (`pip install forensivision`)
- JavaScript/TypeScript (`npm install @forensivision/sdk`)
- Go (`go get github.com/forensivision/forensivision-go`)
- Ruby (`gem install forensivision`)
- PHP (`composer require forensivision/sdk`)

### 10.3 Environment Variables

```bash
# API Configuration
FORENSIVISION_API_URL=https://api.forensivision.com
FORENSIVISION_API_VERSION=v1

# Authentication
FORENSIVISION_API_KEY=fv_live_sk_...

# Timeouts
FORENSIVISION_CONNECT_TIMEOUT=10
FORENSIVISION_READ_TIMEOUT=120

# Retry Configuration
FORENSIVISION_MAX_RETRIES=3
FORENSIVISION_RETRY_DELAY=1
```

### 10.4 Glossary

| Term | Definition |
|------|------------|
| **Analysis Job** | A unit of work representing a single file analysis request |
| **Batch** | A collection of analysis jobs submitted together |
| **Confidence Score** | Probability (0-1) that content is AI-generated |
| **Ensemble** | Combination of multiple ML model outputs |
| **Heatmap** | Visual overlay showing detected manipulation regions |
| **Verdict** | Final classification (ai_generated, manipulated, authentic) |
| **Worker** | Background process that executes ML inference |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-02 | Architecture Team | Initial specification |

---

*This document is confidential and intended for internal use at ForensiVision.*
