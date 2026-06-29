"""Integration tests for the eval-runs and discovery endpoints (via ASGI)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.integration


async def test_list_eval_runs(client: AsyncClient) -> None:
    resp = await client.get("/v1/eval-runs?limit=10")
    assert resp.status_code == 200
    runs = resp.json()
    assert len(runs) == 6
    first = runs[0]
    assert first["verdict"] in {"pass", "degrade", "block", "pending"}
    assert "judges" in first


async def test_get_eval_run_detail(client: AsyncClient) -> None:
    listing = (await client.get("/v1/eval-runs")).json()
    run_id = listing[0]["evaluation_id"]
    resp = await client.get(f"/v1/eval-runs/{run_id}")
    assert resp.status_code == 200
    detail = resp.json()
    assert detail["evaluation_id"] == run_id
    assert isinstance(detail["results"], list)


async def test_get_eval_run_unknown_is_404(client: AsyncClient) -> None:
    resp = await client.get("/v1/eval-runs/does-not-exist")
    assert resp.status_code == 404


async def test_list_judges(client: AsyncClient) -> None:
    resp = await client.get("/v1/judges")
    assert resp.status_code == 200
    names = {j["name"] for j in resp.json()}
    assert "safety" in names


async def test_list_models(client: AsyncClient) -> None:
    resp = await client.get("/v1/models")
    assert resp.status_code == 200
    profiles = resp.json()
    assert profiles[0]["provider"] == "anthropic"
    assert "api_key" not in profiles[0]
