"""Inference routes: run one inference and read the history arc-model-lab keeps."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query, status

from arc_platform.core.deps import InferenceServiceDep
from arc_platform.schemas.inference import (
    InferenceDetail,
    InferenceRequest,
    InferenceSummary,
)

router = APIRouter(prefix="/v1/inference", tags=["inference"])


@router.post("", response_model=InferenceDetail, status_code=status.HTTP_201_CREATED)
async def run_inference(
    request: InferenceRequest, service: InferenceServiceDep
) -> InferenceDetail:
    """Run one inference through arc-model-lab and return the persisted record."""
    return await service.run_inference(request)


@router.get("", response_model=list[InferenceSummary])
async def list_inferences(
    service: InferenceServiceDep,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[InferenceSummary]:
    """List recent inference runs, most recent first."""
    return await service.list_inferences(limit=limit)


@router.get("/{inference_id}", response_model=InferenceDetail)
async def get_inference(
    inference_id: str, service: InferenceServiceDep
) -> InferenceDetail:
    """Return one full inference record (404 if unknown)."""
    return await service.get_inference(inference_id)
