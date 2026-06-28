"""Integration tests for the requests API."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.integration


async def test_list_requests_returns_rows(client: AsyncClient) -> None:
    response = await client.get("/v1/requests")
    assert response.status_code == 200
    rows = response.json()
    assert isinstance(rows, list)
    assert rows
    first = rows[0]
    assert {"request_id", "trace_id", "latency_ms", "model_name", "status"} <= set(
        first
    )


async def test_list_requests_respects_limit(client: AsyncClient) -> None:
    response = await client.get("/v1/requests", params={"limit": 3})
    assert response.status_code == 200
    assert len(response.json()) == 3


async def test_list_requests_rejects_bad_limit(client: AsyncClient) -> None:
    response = await client.get("/v1/requests", params={"limit": 0})
    assert response.status_code == 422


async def test_get_request_detail(client: AsyncClient) -> None:
    listing = await client.get("/v1/requests", params={"limit": 1})
    request_id = listing.json()[0]["request_id"]

    response = await client.get(f"/v1/requests/{request_id}")
    assert response.status_code == 200
    detail = response.json()
    assert detail["request_id"] == request_id
    assert "prompt" in detail
    assert "response" in detail


async def test_get_request_unknown_returns_404(client: AsyncClient) -> None:
    response = await client.get("/v1/requests/unknown-id")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]
