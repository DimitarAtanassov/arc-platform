# syntax=docker/dockerfile:1
# Backend (FastAPI BFF) image for arc-platform.
# Build from the repo root:  docker build -f docker/Dockerfile -t arc-platform-backend .

FROM python:3.13-slim AS runtime

# uv: fast, reproducible installs.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy

# NOTE: deliberately not /app (reserved name avoided per platform conventions).
WORKDIR /srv

# Dependency metadata + source (hatchling packages live under backend/src).
COPY pyproject.toml README.md ./
COPY backend ./backend

RUN uv venv && uv pip install -e .

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "arc_platform.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
