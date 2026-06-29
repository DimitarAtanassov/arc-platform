"""Integration tests for the Playground endpoints (infer proxy + discovery)."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from arc_platform.api.main import create_app
from arc_platform.core.deps import get_eval_reader, get_gateway_client
from arc_platform.core.errors import UpstreamError
from arc_platform.schemas.models import InferRequest, InferResult, ProviderInfo

pytestmark = pytest.mark.integration


class _FailingGateway:
    """A gateway whose infer call always fails (for the 502 path)."""

    async def infer(self, request: InferRequest) -> InferResult:
        raise UpstreamError("gateway", "boom")

    async def list_providers(self) -> list[ProviderInfo]:
        return []


async def test_list_providers(client: AsyncClient) -> None:
    resp = await client.get("/v1/providers")
    assert resp.status_code == 200
    names = {p["name"] for p in resp.json()}
    assert {"mock", "anthropic"} <= names


async def test_infer_proxies_to_gateway(client: AsyncClient) -> None:
    resp = await client.post(
        "/v1/infer",
        json={
            "prompt": "hello",
            "model": "mock",
            "provider": "mock",
            "system": "be terse",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["request_id"] == "req-x"
    assert body["response"] == "[mock] hello"
    assert body["scores"] == {"safety": 1.0}


async def test_infer_validates_empty_prompt(client: AsyncClient) -> None:
    resp = await client.post("/v1/infer", json={"prompt": ""})
    assert resp.status_code == 422


async def test_infer_upstream_failure_is_502() -> None:
    app = create_app()
    app.dependency_overrides[get_gateway_client] = _FailingGateway
    app.dependency_overrides[get_eval_reader] = lambda: None  # unused on this path
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/v1/infer", json={"prompt": "hi"})
    app.dependency_overrides.clear()
    assert resp.status_code == 502
    assert "gateway" in resp.json()["detail"]
