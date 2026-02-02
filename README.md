# ForensiVision

AI-generated content detection platform for identifying deepfakes, synthetic images, and manipulated media.

## Overview

ForensiVision uses advanced machine learning to detect AI-generated content with 97%+ accuracy. The platform provides:

- **Web UI** - Drag-and-drop interface for instant media verification
- **REST API** - Programmatic integration for developers
- **Explainable AI** - Visual heatmaps and detailed reports

## Architecture

```
forensivision/
├── frontend/           # Next.js 15 web application
├── services/
│   ├── auth/          # Go authentication service
│   ├── analysis/      # Python/FastAPI job orchestration
│   ├── storage/       # Go file upload service
│   └── ml-worker/     # Python ML inference workers
├── database/          # PostgreSQL migrations
└── docs/              # Documentation
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| API Services | Go (Gin), Python (FastAPI) |
| ML Inference | Python, PyTorch, ONNX |
| Database | PostgreSQL |
| Cache | Redis |
| Message Queue | RabbitMQ |
| Object Storage | S3/MinIO |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Go 1.22+
- Python 3.11+

### Development Setup

1. **Start infrastructure services:**

```bash
docker-compose up -d
```

This starts PostgreSQL, Redis, RabbitMQ, and MinIO.

2. **Install frontend dependencies:**

```bash
cd frontend
npm install
npm run dev
```

3. **Run backend services:**

For the auth service (Go):
```bash
cd services/auth
go mod download
go run cmd/server/main.go
```

For the analysis service (Python):
```bash
cd services/analysis
pip install -e .
python -m src.main
```

4. **Access the application:**

- Frontend: http://localhost:3000
- Auth API: http://localhost:8081
- Analysis API: http://localhost:8082
- RabbitMQ Console: http://localhost:15672
- MinIO Console: http://localhost:9001

## API Usage

### Authentication

```bash
# Register a new user
curl -X POST http://localhost:8081/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123", "name": "User"}'

# Login
curl -X POST http://localhost:8081/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Create API key
curl -X POST http://localhost:8081/v1/api-keys \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My API Key", "environment": "live"}'
```

### Image Analysis

```bash
# Analyze image by URL
curl -X POST http://localhost:8082/v1/analyze/image \
  -H "Authorization: Bearer fv_live_sk_..." \
  -H "Content-Type: application/json" \
  -d '{
    "source": {"type": "url", "url": "https://example.com/image.jpg"},
    "options": {"include_heatmap": true}
  }'

# Get analysis result
curl http://localhost:8082/v1/analysis/<analysis_id> \
  -H "Authorization: Bearer fv_live_sk_..."
```

## Project Structure

### Frontend (`/frontend`)

- `/src/app` - Next.js App Router pages
- `/src/components` - React components
- `/src/lib` - Utilities and helpers

### Auth Service (`/services/auth`)

- `/cmd/server` - Application entry point
- `/internal/api` - HTTP handlers
- `/internal/service` - Business logic
- `/internal/repository` - Database access

### Analysis Service (`/services/analysis`)

- `/src/api` - FastAPI routes
- `/src/services` - Business logic
- `/src/models` - Pydantic models

### ML Worker (`/services/ml-worker`)

- `/src/detectors` - Detection model implementations
- `/src/main.py` - Worker entry point

## Database Schema

The database includes tables for:

- `users` - User accounts
- `organizations` - Teams/companies
- `api_keys` - API key management
- `analyses` - Analysis jobs
- `analysis_results` - Detection results
- `webhooks` - Webhook configurations
- `usage` - Usage tracking

See `/database/migrations/001_initial_schema.sql` for the full schema.

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://...` |
| `REDIS_URL` | Redis connection string | `localhost:6379` |
| `RABBITMQ_URL` | RabbitMQ connection string | `amqp://...` |
| `S3_ENDPOINT` | S3/MinIO endpoint | `http://localhost:9000` |
| `JWT_SECRET` | JWT signing secret | (required) |

## License

Proprietary - All rights reserved.
