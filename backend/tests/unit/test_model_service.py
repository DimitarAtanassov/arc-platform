"""Unit tests for ModelService (ordering + delegation)."""

from __future__ import annotations

import pytest

from arc_platform.clients.model_lab_client import ModelLabClient
from arc_platform.core.errors import NotFoundError
from arc_platform.services.model_service import ModelService

pytestmark = pytest.mark.unit


async def test_list_models_sorted_by_provider_then_name(
    fake_client: ModelLabClient,
) -> None:
    service = ModelService(client=fake_client)
    ids = [model.model_id for model in await service.list_models()]
    assert ids == ["claude-sonnet-4", "gemini-2-flash", "gpt-4o", "gpt-4o-mini"]


async def test_get_model_delegates(fake_client: ModelLabClient) -> None:
    service = ModelService(client=fake_client)
    detail = await service.get_model("gpt-4o")
    assert detail.model_id == "gpt-4o"
    assert detail.provider == "openai"


async def test_get_model_unknown_raises_not_found(
    fake_client: ModelLabClient,
) -> None:
    service = ModelService(client=fake_client)
    with pytest.raises(NotFoundError):
        await service.get_model("ghost")
