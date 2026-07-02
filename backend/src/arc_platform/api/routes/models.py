"""Model-catalog routes."""

from __future__ import annotations

from fastapi import APIRouter

from arc_platform.core.deps import ModelServiceDep
from arc_platform.schemas.models import ModelDetail, ModelSummary

router = APIRouter(prefix="/v1/models", tags=["models"])


@router.get("", response_model=list[ModelSummary])
async def list_models(service: ModelServiceDep) -> list[ModelSummary]:
    """List the models arc-model-lab exposes, ordered by provider then name."""
    return await service.list_models()


@router.get("/{model_id}", response_model=ModelDetail)
async def get_model(model_id: str, service: ModelServiceDep) -> ModelDetail:
    """Return the full profile for one model (404 if unknown)."""
    return await service.get_model(model_id)
