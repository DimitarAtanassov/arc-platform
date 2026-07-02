"""Integration tests for the inference routes (via the ASGI app)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.integration


async def test_run_inference_returns_created_camelcase(
    app_client: AsyncClient,
) -> None:
    payload = {
        "modelId": "gpt-4o",
        "prompt": "Say hi",
        "systemPrompt": "Be terse",
        "params": {"temperature": 0.2, "maxTokens": 64, "topP": 0.8},
    }
    resp = await app_client.post("/v1/inference", json=payload)

    assert resp.status_code == 201
    body = resp.json()
    assert body["modelId"] == "gpt-4o"
    assert body["status"] == "succeeded"
    assert body["promptPreview"].startswith("Say hi")
    assert body["params"]["maxTokens"] == 64
    assert body["usage"]["totalTokens"] == 30


async def test_run_inference_accepts_snake_case_body(
    app_client: AsyncClient,
) -> None:
    resp = await app_client.post(
        "/v1/inference", json={"model_id": "gpt-4o", "prompt": "hi"}
    )
    assert resp.status_code == 201


async def test_run_inference_rejects_empty_prompt(app_client: AsyncClient) -> None:
    resp = await app_client.post(
        "/v1/inference", json={"modelId": "gpt-4o", "prompt": ""}
    )
    assert resp.status_code == 422


async def test_list_and_get_inference_roundtrip(app_client: AsyncClient) -> None:
    created = (
        await app_client.post(
            "/v1/inference", json={"modelId": "gpt-4o", "prompt": "hi"}
        )
    ).json()
    inference_id = created["inferenceId"]

    listed = await app_client.get("/v1/inference")
    assert listed.status_code == 200
    assert any(run["inferenceId"] == inference_id for run in listed.json())

    fetched = await app_client.get(f"/v1/inference/{inference_id}")
    assert fetched.status_code == 200
    assert fetched.json()["inferenceId"] == inference_id


async def test_get_unknown_inference_returns_404(app_client: AsyncClient) -> None:
    resp = await app_client.get("/v1/inference/ghost")
    assert resp.status_code == 404
    assert resp.json()["code"] == "not_found"


async def test_list_inference_rejects_bad_limit(app_client: AsyncClient) -> None:
    resp = await app_client.get("/v1/inference", params={"limit": 0})
    assert resp.status_code == 422
