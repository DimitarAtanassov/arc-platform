"""Integration tests for the model-catalog routes (via the ASGI app)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.integration


async def test_list_models_returns_sorted_camelcase(app_client: AsyncClient) -> None:
    resp = await app_client.get("/v1/models")
    assert resp.status_code == 200
    data = resp.json()

    assert [model["modelId"] for model in data] == [
        "claude-sonnet-4",
        "gemini-2-flash",
        "gpt-4o",
        "gpt-4o-mini",
    ]
    # camelCase is the public wire contract.
    assert "displayName" in data[0]
    assert "contextWindow" in data[0]
    assert "maxOutputTokens" in data[0]
    assert "revision" in data[0]
    assert "tokenizerId" in data[0]
    assert "createdAt" in data[0]
    assert "updatedAt" in data[0]


async def test_get_model_returns_detail(app_client: AsyncClient) -> None:
    resp = await app_client.get("/v1/models/gpt-4o")
    assert resp.status_code == 200
    body = resp.json()
    assert body["modelId"] == "gpt-4o"
    assert body["displayName"] == "GPT-4o"
    assert body["capabilities"] == ["chat", "tools", "vision"]
    assert body["modalities"] == ["text", "vision"]
    assert body["runtimeSource"] == "openai://chat/gpt-4o"
    assert body["tokenizerId"] == "o200k_base"


async def test_get_unknown_model_returns_404(app_client: AsyncClient) -> None:
    resp = await app_client.get("/v1/models/ghost")
    assert resp.status_code == 404
    body = resp.json()
    assert body["code"] == "not_found"
    assert "ghost" in body["detail"]
