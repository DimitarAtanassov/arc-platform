"""Contract tests for ModelLabClient.

These pin the wire contract with arc-model-lab: the request shapes the BFF sends,
the snake_case records it accepts, the camelCase normalization it produces, and
the failure taxonomy (404 -> NotFound, error -> 502, unreachable -> 503, reads
degrade to empty).
"""

from __future__ import annotations

import json

import httpx
import pytest
import respx

from arc_platform.clients.model_lab_client import ModelLabClient
from arc_platform.core.errors import (
    NotFoundError,
    UpstreamError,
    UpstreamUnavailableError,
)
from arc_platform.schemas.inference import InferenceParams, InferenceRequest
from arc_platform.schemas.models import ModelStatus

pytestmark = pytest.mark.contract

_BASE = "http://model-lab"


def _model_record() -> dict[str, object]:
    return {
        "model_id": "gpt-4o",
        "display_name": "GPT-4o",
        "provider": "openai",
        "family": "gpt-4",
        "status": "available",
        "revision": "2024-08-06",
        "tokenizer_id": "o200k_base",
        "adapter_path": "s3://arc-adapters/gpt-4o/lora-v1",
        "context_window": 128_000,
        "max_output_tokens": 16_384,
        "modalities": ["text", "vision"],
        "description": "Flagship multimodal model.",
        "runtime_source": "openai://chat/gpt-4o",
        "created_at": "2024-08-06T00:00:00+00:00",
        "updated_at": "2025-01-15T00:00:00+00:00",
        "capabilities": ["chat", "tools", "vision"],
    }


def _inference_record(prompt: str = "Say hello.") -> dict[str, object]:
    return {
        "inference_id": "inf-1",
        "model_id": "gpt-4o",
        "status": "succeeded",
        "created_at": "2026-07-01T12:00:00+00:00",
        "latency_ms": 812.5,
        "prompt": prompt,
        "system_prompt": "You are helpful.",
        "output_text": "Hello!",
        "finish_reason": "stop",
        "params": {"temperature": 0.7, "max_tokens": 512, "top_p": 1.0},
        "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
        "error": None,
    }


def _client() -> ModelLabClient:
    return ModelLabClient(base_url=_BASE, timeout_s=1.0, inference_timeout_s=1.0)


@respx.mock
async def test_list_models_normalizes_to_camel() -> None:
    respx.get(f"{_BASE}/v1/models").mock(
        return_value=httpx.Response(200, json=[_model_record()])
    )
    models = await _client().list_models()

    assert len(models) == 1
    model = models[0]
    assert model.model_id == "gpt-4o"
    assert model.status is ModelStatus.AVAILABLE
    assert model.context_window == 128_000
    assert model.modalities == ("text", "vision")
    assert model.revision == "2024-08-06"
    assert model.tokenizer_id == "o200k_base"
    # The public wire contract is camelCase for the TypeScript frontend.
    wire = model.model_dump(by_alias=True)
    assert wire["displayName"] == "GPT-4o"
    assert wire["contextWindow"] == 128_000
    assert wire["maxOutputTokens"] == 16_384
    assert wire["tokenizerId"] == "o200k_base"
    assert wire["adapterPath"] == "s3://arc-adapters/gpt-4o/lora-v1"


@respx.mock
async def test_list_models_degrades_to_empty_on_error() -> None:
    respx.get(f"{_BASE}/v1/models").mock(return_value=httpx.Response(503))
    assert await _client().list_models() == []


@respx.mock
async def test_list_models_degrades_to_empty_when_unreachable() -> None:
    respx.get(f"{_BASE}/v1/models").mock(side_effect=httpx.ConnectError("down"))
    assert await _client().list_models() == []


@respx.mock
async def test_get_model_maps_full_detail() -> None:
    respx.get(f"{_BASE}/v1/models/gpt-4o").mock(
        return_value=httpx.Response(200, json=_model_record())
    )
    detail = await _client().get_model("gpt-4o")

    assert detail.description == "Flagship multimodal model."
    assert detail.revision == "2024-08-06"
    assert detail.tokenizer_id == "o200k_base"
    assert detail.adapter_path == "s3://arc-adapters/gpt-4o/lora-v1"
    assert detail.runtime_source == "openai://chat/gpt-4o"
    assert detail.capabilities == ("chat", "tools", "vision")
    assert detail.created_at is not None
    assert detail.updated_at is not None


@respx.mock
async def test_get_model_missing_raises_not_found() -> None:
    respx.get(f"{_BASE}/v1/models/ghost").mock(return_value=httpx.Response(404))
    with pytest.raises(NotFoundError):
        await _client().get_model("ghost")


@respx.mock
async def test_get_model_error_raises_upstream() -> None:
    respx.get(f"{_BASE}/v1/models/gpt-4o").mock(
        return_value=httpx.Response(500, json={"detail": "boom"})
    )
    with pytest.raises(UpstreamError, match="boom") as exc:
        await _client().get_model("gpt-4o")
    assert not isinstance(exc.value, UpstreamUnavailableError)


@respx.mock
async def test_get_model_unreachable_raises_unavailable() -> None:
    respx.get(f"{_BASE}/v1/models/gpt-4o").mock(
        side_effect=httpx.ConnectError("refused")
    )
    with pytest.raises(UpstreamUnavailableError):
        await _client().get_model("gpt-4o")


@respx.mock
async def test_run_inference_sends_snake_payload_and_maps_result() -> None:
    route = respx.post(f"{_BASE}/v1/inference").mock(
        return_value=httpx.Response(201, json=_inference_record())
    )
    request = InferenceRequest(
        model_id="gpt-4o",
        prompt="Say hello.",
        system_prompt="You are helpful.",
        params=InferenceParams(temperature=0.7, max_tokens=512, top_p=1.0),
    )
    detail = await _client().run_inference(request)

    sent = json.loads(route.calls.last.request.content)
    assert sent["model_id"] == "gpt-4o"
    assert sent["system_prompt"] == "You are helpful."
    assert sent["params"] == {"temperature": 0.7, "max_tokens": 512, "top_p": 1.0}

    assert detail.inference_id == "inf-1"
    assert detail.output == "Hello!"
    assert detail.usage is not None
    assert detail.usage.total_tokens == 30
    assert detail.params.max_tokens == 512


@respx.mock
async def test_run_inference_omits_unset_params() -> None:
    route = respx.post(f"{_BASE}/v1/inference").mock(
        return_value=httpx.Response(201, json=_inference_record())
    )
    await _client().run_inference(InferenceRequest(model_id="gpt-4o", prompt="hi"))

    sent = json.loads(route.calls.last.request.content)
    assert sent["params"] == {}


@respx.mock
async def test_run_inference_unknown_model_raises_not_found() -> None:
    respx.post(f"{_BASE}/v1/inference").mock(return_value=httpx.Response(404))
    with pytest.raises(NotFoundError):
        await _client().run_inference(InferenceRequest(model_id="ghost", prompt="hi"))


@respx.mock
async def test_run_inference_error_surfaces_detail() -> None:
    respx.post(f"{_BASE}/v1/inference").mock(
        return_value=httpx.Response(400, json={"detail": "temperature too high"})
    )
    with pytest.raises(UpstreamError, match="temperature too high"):
        await _client().run_inference(InferenceRequest(model_id="gpt-4o", prompt="hi"))


@respx.mock
async def test_run_inference_unreachable_raises_unavailable() -> None:
    respx.post(f"{_BASE}/v1/inference").mock(side_effect=httpx.ConnectError("down"))
    with pytest.raises(UpstreamUnavailableError):
        await _client().run_inference(InferenceRequest(model_id="gpt-4o", prompt="hi"))


@respx.mock
async def test_list_inferences_truncates_prompt_preview() -> None:
    long_prompt = "word " * 100
    respx.get(f"{_BASE}/v1/inference").mock(
        return_value=httpx.Response(200, json=[_inference_record(prompt=long_prompt)])
    )
    runs = await _client().list_inferences(limit=50)

    assert len(runs) == 1
    assert len(runs[0].prompt_preview) <= 140
    assert runs[0].prompt_preview.endswith("\u2026")
    assert runs[0].total_tokens == 30


@respx.mock
async def test_list_inferences_degrades_to_empty() -> None:
    respx.get(f"{_BASE}/v1/inference").mock(side_effect=httpx.ConnectError("down"))
    assert await _client().list_inferences(limit=50) == []


@respx.mock
async def test_get_inference_maps_detail() -> None:
    respx.get(f"{_BASE}/v1/inference/inf-1").mock(
        return_value=httpx.Response(200, json=_inference_record())
    )
    detail = await _client().get_inference("inf-1")
    assert detail.inference_id == "inf-1"
    assert detail.system_prompt == "You are helpful."
    assert detail.finish_reason == "stop"


@respx.mock
async def test_get_inference_missing_raises_not_found() -> None:
    respx.get(f"{_BASE}/v1/inference/ghost").mock(return_value=httpx.Response(404))
    with pytest.raises(NotFoundError):
        await _client().get_inference("ghost")
