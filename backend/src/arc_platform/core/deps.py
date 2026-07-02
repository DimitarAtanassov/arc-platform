"""Dependency injection wiring.

One-directional layering: api -> services -> client. The api/ layer depends on
these factories rather than constructing the client or services directly, which
keeps the single downstream (arc-model-lab) swappable behind
``get_model_lab_client`` and makes tests inject a fake in one place.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from arc_platform.clients.model_lab_client import ModelLabClient
from arc_platform.core.config import Settings, get_settings
from arc_platform.services.inference_service import InferenceService
from arc_platform.services.model_service import ModelService


@lru_cache(maxsize=1)
def get_model_lab_client() -> ModelLabClient:
    """Return the process-wide arc-model-lab client (the BFF's only downstream)."""
    settings = get_settings()
    return ModelLabClient(
        base_url=settings.model_lab_url,
        timeout_s=settings.model_lab_timeout_s,
        inference_timeout_s=settings.model_lab_inference_timeout_s,
    )


ClientDep = Annotated[ModelLabClient, Depends(get_model_lab_client)]


def get_model_service(client: ClientDep) -> ModelService:
    """Return a :class:`ModelService` wired to the active client."""
    return ModelService(client=client)


def get_inference_service(client: ClientDep) -> InferenceService:
    """Return an :class:`InferenceService` wired to the active client."""
    return InferenceService(client=client)


SettingsDep = Annotated[Settings, Depends(get_settings)]
ModelServiceDep = Annotated[ModelService, Depends(get_model_service)]
InferenceServiceDep = Annotated[InferenceService, Depends(get_inference_service)]
