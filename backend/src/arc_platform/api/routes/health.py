"""Liveness route."""

from __future__ import annotations

from fastapi import APIRouter

from arc_platform import __version__
from arc_platform.core.deps import SettingsDep
from arc_platform.schemas.health import HealthResponse

router = APIRouter(tags=["ops"])


@router.get("/health", response_model=HealthResponse)
async def health(settings: SettingsDep) -> HealthResponse:
    """Liveness probe. Does not touch arc-model-lab."""
    return HealthResponse(
        status="ok", service=settings.service_name, version=__version__
    )
