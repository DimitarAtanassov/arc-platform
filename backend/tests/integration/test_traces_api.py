"""Integration tests for the traces + evaluations API."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.integration


async def test_get_trace_returns_span_tree(client: AsyncClient) -> None:
    listing = await client.get("/v1/requests", params={"limit": 1})
    trace_id = listing.json()[0]["trace_id"]

    response = await client.get(f"/v1/traces/{trace_id}")
    assert response.status_code == 200
    trace = response.json()
    assert trace["trace_id"] == trace_id
    assert trace["spans"]
    assert any(span["parent_span_id"] is None for span in trace["spans"])


async def test_get_trace_unknown_returns_404(client: AsyncClient) -> None:
    response = await client.get("/v1/traces/unknown-trace")
    assert response.status_code == 404


async def test_evaluation_summary(client: AsyncClient) -> None:
    response = await client.get("/v1/evaluations/summary")
    assert response.status_code == 200
    summary = response.json()
    assert summary["total_evaluations"] >= 0
    assert isinstance(summary["metrics"], list)
