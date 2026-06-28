"""End-to-end flow: request list -> request detail -> trace tree (mocked data)."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.e2e


async def test_request_to_trace_flow(client: AsyncClient) -> None:
    # 1. The list view loads requests.
    listing = await client.get("/v1/requests")
    assert listing.status_code == 200
    rows = listing.json()
    assert rows

    # 2. Clicking a request opens its detail view.
    request_id = rows[0]["request_id"]
    detail_response = await client.get(f"/v1/requests/{request_id}")
    assert detail_response.status_code == 200
    detail = detail_response.json()

    # 3. The detail links to a trace, which resolves to a full span tree.
    trace_response = await client.get(f"/v1/traces/{detail['trace_id']}")
    assert trace_response.status_code == 200
    trace = trace_response.json()

    # 4. The trace is internally consistent with the request.
    assert trace["request_id"] == request_id
    assert trace["duration_ms"] == detail["latency_ms"]
    assert trace["spans"][0]["name"] == "arc.gateway.request"
