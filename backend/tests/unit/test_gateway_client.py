"""Unit tests for the gateway client (HTTP wire + mapping + error paths)."""

from __future__ import annotations

import httpx
import pytest
import respx

from arc_platform.clients.gateway import GatewayClient
from arc_platform.core.errors import UpstreamError
from arc_platform.schemas.models import InferRequest

pytestmark = pytest.mark.unit

_BASE = "http://gw"


@respx.mock
async def test_infer_maps_response() -> None:
    respx.post(f"{_BASE}/v1/infer").mock(
        return_value=httpx.Response(
            200,
            json={
                "request_id": "r1",
                "trace_id": "t1",
                "response": "hi there",
                "model": "mock",
                "blocked": False,
                "scores": {"safety": 1.0},
            },
        )
    )
    client = GatewayClient(base_url=_BASE)
    result = await client.infer(InferRequest(prompt="hi", model="mock"))
    assert result.request_id == "r1"
    assert result.scores == {"safety": 1.0}


@respx.mock
async def test_infer_surfaces_upstream_error_detail() -> None:
    respx.post(f"{_BASE}/v1/infer").mock(
        return_value=httpx.Response(400, json={"detail": "no API key for 'openai'"})
    )
    client = GatewayClient(base_url=_BASE)
    with pytest.raises(UpstreamError, match="no API key"):
        await client.infer(InferRequest(prompt="hi", provider="openai"))


@respx.mock
async def test_infer_raises_when_unreachable() -> None:
    respx.post(f"{_BASE}/v1/infer").mock(side_effect=httpx.ConnectError("down"))
    client = GatewayClient(base_url=_BASE)
    with pytest.raises(UpstreamError, match="unreachable"):
        await client.infer(InferRequest(prompt="hi"))


@respx.mock
async def test_list_providers_maps_catalog() -> None:
    respx.get(f"{_BASE}/v1/providers").mock(
        return_value=httpx.Response(
            200,
            json=[{"name": "mock", "configured": True, "models": ["mock"]}],
        )
    )
    client = GatewayClient(base_url=_BASE)
    providers = await client.list_providers()
    assert providers[0].name == "mock"
    assert providers[0].configured is True


@respx.mock
async def test_list_providers_degrades_to_empty() -> None:
    respx.get(f"{_BASE}/v1/providers").mock(return_value=httpx.Response(503))
    client = GatewayClient(base_url=_BASE)
    assert await client.list_providers() == []
