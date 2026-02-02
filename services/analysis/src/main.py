import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import router
from src.core.config import settings
from src.core.database import init_db, close_db
from src.core.redis import init_redis, close_redis
from src.core.rabbitmq import init_rabbitmq, close_rabbitmq

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    logger.info("Starting Analysis Service...")

    # Initialize connections
    await init_db()
    await init_redis()
    await init_rabbitmq()

    logger.info("Analysis Service started successfully")

    yield

    # Cleanup
    logger.info("Shutting down Analysis Service...")
    await close_rabbitmq()
    await close_redis()
    await close_db()
    logger.info("Analysis Service shutdown complete")


app = FastAPI(
    title="ForensiVision Analysis Service",
    description="AI-generated content detection analysis orchestration service",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router, prefix="/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "analysis"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=int(settings.port),
        reload=settings.environment == "development",
    )
