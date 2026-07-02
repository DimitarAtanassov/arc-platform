"""End-to-end flow: run inference through the BFF, then read it back.

Exercises the full browser -> BFF -> arc-model-lab path (with a stateful fake for
arc-model-lab): POST persists a run, the history lists it newest-first, the
detail is retrievable, and the producing model is in the catalog.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.e2e


async def test_run_then_read_inference(app_client: AsyncClient) -> None:
    first = (
        await app_client.post(
            "/v1/inference", json={"modelId": "gpt-4o", "prompt": "first"}
        )
    ).json()
    second = (
        await app_client.post(
            "/v1/inference",
            json={"modelId": "claude-sonnet-4", "prompt": "second"},
        )
    ).json()

    history = (await app_client.get("/v1/inference")).json()
    ids = [run["inferenceId"] for run in history]
    assert ids[0] == second["inferenceId"]
    assert first["inferenceId"] in ids

    detail = (await app_client.get(f"/v1/inference/{first['inferenceId']}")).json()
    assert detail["prompt"] == "first"
    assert detail["output"].startswith("[gpt-4o]")

    models = (await app_client.get("/v1/models")).json()
    assert any(model["modelId"] == "gpt-4o" for model in models)
