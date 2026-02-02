# Base image with CUDA support for GPU inference
FROM nvidia/cuda:12.2.0-runtime-ubuntu22.04 AS base

# Install Python and dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-venv \
    python3-pip \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set up Python
RUN ln -sf /usr/bin/python3.11 /usr/bin/python

WORKDIR /app

# Install Python dependencies
COPY pyproject.toml ./
RUN pip install --no-cache-dir .

# Copy application code
COPY src/ ./src/

# Create models directory
RUN mkdir -p /app/models

# Create non-root user
RUN useradd -m -u 1000 appuser
USER appuser

# Environment
ENV PYTHONUNBUFFERED=1

CMD ["python", "-m", "src.main"]
