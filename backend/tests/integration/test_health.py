"""Integration test for the health endpoint."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.integration


async def test_health_returns_ok(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"]


async def test_response_carries_request_id(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.headers["x-request-id"]


async def test_inbound_request_id_is_echoed(client: AsyncClient) -> None:
    response = await client.get("/health", headers={"X-Request-ID": "trace-123"})
    assert response.headers["x-request-id"] == "trace-123"
