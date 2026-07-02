"""Unit tests for InferenceService (ordering, limit, delegation)."""

from __future__ import annotations

import pytest

from arc_platform.clients.model_lab_client import ModelLabClient
from arc_platform.schemas.inference import InferenceRequest, InferenceStatus
from arc_platform.services.inference_service import InferenceService

pytestmark = pytest.mark.unit


async def _seed(client: ModelLabClient, count: int) -> None:
    for index in range(count):
        await client.run_inference(
            InferenceRequest(model_id="gpt-4o", prompt=f"prompt {index}")
        )


async def test_list_inferences_newest_first_and_limited(
    fake_client: ModelLabClient,
) -> None:
    await _seed(fake_client, 3)
    service = InferenceService(client=fake_client)

    runs = await service.list_inferences(limit=2)

    assert [run.inference_id for run in runs] == ["inf-3", "inf-2"]


async def test_run_inference_delegates(fake_client: ModelLabClient) -> None:
    service = InferenceService(client=fake_client)
    detail = await service.run_inference(
        InferenceRequest(model_id="gpt-4o", prompt="hi")
    )
    assert detail.status is InferenceStatus.SUCCEEDED
    assert detail.output is not None
    assert detail.output.startswith("[gpt-4o]")


async def test_get_inference_delegates(fake_client: ModelLabClient) -> None:
    service = InferenceService(client=fake_client)
    created = await service.run_inference(
        InferenceRequest(model_id="gpt-4o", prompt="hi")
    )
    fetched = await service.get_inference(created.inference_id)
    assert fetched.inference_id == created.inference_id
