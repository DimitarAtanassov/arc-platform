# syntax=docker/dockerfile:1
# Backend (FastAPI BFF) image for arc-platform.
# Build from the repo root:  docker build -f docker/Dockerfile -t arc-platform-backend .

# --- Builder: resolve deps (incl. the arc-telemetry Git source) into a venv.
# git is required because arc-telemetry is a Git dependency (see pyproject).
FROM python:3.13-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

# NOTE: deliberately not /app (reserved name avoided per platform conventions).
WORKDIR /srv

# Dependency metadata + source (hatchling packages live under backend/src).
COPY pyproject.toml uv.lock README.md ./
COPY backend ./backend

# Reproducible install from the lockfile; runtime deps only (no dev/lint).
RUN uv sync --frozen --no-default-groups

# --- Runtime: slim image with just the prebuilt venv + source. No git, no uv.
FROM python:3.13-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/srv/.venv/bin:$PATH"

WORKDIR /srv
COPY --from=builder /srv /srv

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8001/health').status==200 else 1)"]

CMD ["uvicorn", "arc_platform.main:app", "--host", "0.0.0.0", "--port", "8001"]
