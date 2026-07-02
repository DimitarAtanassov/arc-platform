"""Integration tests for graceful downstream failure handling.

Reads degrade to empty; single-resource reads surface 404/503; a user-invoked
write surfaces 502; anything unexpected becomes a safe 500 with no stack trace.
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from arc_platform.clients.model_lab_client import ModelLabClient
from arc_platform.core.deps import get_model_lab_client
from arc_platform.core.errors import UpstreamError, UpstreamUnavailableError
from arc_platform.main import create_app
from arc_platform.schemas.inference import InferenceDetail, InferenceRequest
from arc_platform.schemas.models import ModelDetail, ModelSummary

pytestmark = pytest.mark.integration


class _UnavailableClient(ModelLabClient):
    def __init__(self) -> None:
        super().__init__(base_url="http://down")

    async def list_models(self) -> list[ModelSummary]:
        return []

    async def get_model(self, model_id: str) -> ModelDetail:
        raise UpstreamUnavailableError("arc-model-lab", "arc-model-lab is unreachable")


class _ErroringClient(ModelLabClient):
    def __init__(self) -> None:
        super().__init__(base_url="http://err")

    async def run_inference(self, request: InferenceRequest) -> InferenceDetail:
        raise UpstreamError("arc-model-lab", "bad upstream")


class _BoomClient(ModelLabClient):
    def __init__(self) -> None:
        super().__init__(base_url="http://boom")

    async def list_models(self) -> list[ModelSummary]:
        raise RuntimeError("unexpected failure")


def _client_for(
    fake: ModelLabClient, *, raise_app_exceptions: bool = True
) -> AsyncClient:
    app = create_app()
    app.dependency_overrides[get_model_lab_client] = lambda: fake
    transport = ASGITransport(app=app, raise_app_exceptions=raise_app_exceptions)
    return AsyncClient(transport=transport, base_url="http://test")


async def test_get_model_unavailable_returns_503() -> None:
    async with _client_for(_UnavailableClient()) as client:
        resp = await client.get("/v1/models/gpt-4o")
    assert resp.status_code == 503
    assert resp.json()["code"] == "service_unavailable"


async def test_list_models_degrades_to_empty() -> None:
    async with _client_for(_UnavailableClient()) as client:
        resp = await client.get("/v1/models")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_run_inference_upstream_error_returns_502() -> None:
    async with _client_for(_ErroringClient()) as client:
        resp = await client.post(
            "/v1/inference", json={"modelId": "gpt-4o", "prompt": "hi"}
        )
    assert resp.status_code == 502
    assert resp.json()["code"] == "upstream_error"


async def test_unexpected_error_returns_safe_500() -> None:
    async with _client_for(_BoomClient(), raise_app_exceptions=False) as client:
        resp = await client.get("/v1/models")
    assert resp.status_code == 500
    assert resp.json() == {"detail": "internal server error", "code": "internal_error"}
