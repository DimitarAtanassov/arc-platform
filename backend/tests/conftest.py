"""Shared test fixtures.

The BFF's only downstream is arc-model-lab. Unit, integration, and e2e tests
inject a stateful in-memory :class:`FakeModelLabClient` (a subclass of the real
client) so no test needs a live model-lab or HTTP. Contract tests instead drive
the real client against respx-mocked responses.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator, Sequence
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient

from arc_platform.clients.model_lab_client import ModelLabClient
from arc_platform.core.deps import get_model_lab_client
from arc_platform.core.errors import NotFoundError
from arc_platform.main import create_app
from arc_platform.schemas.inference import (
    InferenceDetail,
    InferenceRequest,
    InferenceStatus,
    InferenceSummary,
    TokenUsage,
)
from arc_platform.schemas.models import ModelDetail, ModelStatus, ModelSummary


def _default_models() -> list[ModelDetail]:
    """Three models across providers, deliberately unsorted, to exercise ordering."""
    return [
        ModelDetail(
            model_id="gpt-4o",
            display_name="GPT-4o",
            provider="openai",
            family="gpt-4",
            status=ModelStatus.AVAILABLE,
            revision="2024-08-06",
            tokenizer_id="o200k_base",
            adapter_path=None,
            context_window=128_000,
            max_output_tokens=16_384,
            modalities=("text", "vision"),
            created_at=datetime(2024, 8, 6, tzinfo=UTC),
            updated_at=datetime(2025, 1, 15, tzinfo=UTC),
            description="Flagship multimodal model.",
            runtime_source="openai://chat/gpt-4o",
            capabilities=("chat", "tools", "vision"),
        ),
        ModelDetail(
            model_id="gpt-4o-mini",
            display_name="GPT-4o mini",
            provider="openai",
            family="gpt-4",
            status=ModelStatus.AVAILABLE,
            revision="2024-07-18",
            tokenizer_id="o200k_base",
            adapter_path="s3://arc-adapters/gpt-4o-mini/lora-v3",
            context_window=128_000,
            max_output_tokens=16_384,
            modalities=("text",),
            created_at=datetime(2024, 7, 18, tzinfo=UTC),
            updated_at=datetime(2024, 12, 1, tzinfo=UTC),
            runtime_source="openai://chat/gpt-4o-mini",
            capabilities=("chat", "tools"),
        ),
        ModelDetail(
            model_id="claude-sonnet-4",
            display_name="Claude Sonnet 4",
            provider="anthropic",
            family="claude-4",
            status=ModelStatus.AVAILABLE,
            revision="20250219",
            tokenizer_id="claude-v3",
            adapter_path=None,
            context_window=200_000,
            max_output_tokens=64_000,
            modalities=("text",),
            created_at=datetime(2025, 2, 19, tzinfo=UTC),
            updated_at=datetime(2025, 5, 1, tzinfo=UTC),
            description="Balanced Anthropic model.",
            runtime_source="anthropic://messages/claude-sonnet-4",
            capabilities=("chat", "tools"),
        ),
        ModelDetail(
            model_id="gemini-2-flash",
            display_name="Gemini 2 Flash",
            provider="google",
            family="gemini-2",
            status=ModelStatus.PREVIEW,
            revision="preview-0121",
            tokenizer_id="gemini-sp",
            adapter_path=None,
            context_window=1_000_000,
            max_output_tokens=8_192,
            modalities=("text", "vision", "audio"),
            created_at=datetime(2025, 1, 21, tzinfo=UTC),
            updated_at=datetime(2025, 3, 10, tzinfo=UTC),
            runtime_source="vertex://google/gemini-2-flash",
            capabilities=("chat",),
        ),
    ]


def _to_summary(detail: ModelDetail) -> ModelSummary:
    return ModelSummary.model_validate(detail.model_dump())


def _to_inference_summary(detail: InferenceDetail) -> InferenceSummary:
    return InferenceSummary.model_validate(detail.model_dump())


class FakeModelLabClient(ModelLabClient):
    """In-memory, stateful stand-in for the real client (no HTTP)."""

    def __init__(self, *, models: Sequence[ModelDetail] | None = None) -> None:
        super().__init__(base_url="http://fake-model-lab")
        source = list(models) if models is not None else _default_models()
        self._models: dict[str, ModelDetail] = {m.model_id: m for m in source}
        self._inferences: dict[str, InferenceDetail] = {}
        self._counter = 0

    async def list_models(self) -> list[ModelSummary]:
        return [_to_summary(model) for model in self._models.values()]

    async def get_model(self, model_id: str) -> ModelDetail:
        try:
            return self._models[model_id]
        except KeyError:
            raise NotFoundError("model", model_id) from None

    async def run_inference(self, request: InferenceRequest) -> InferenceDetail:
        if request.model_id not in self._models:
            raise NotFoundError("model", request.model_id)
        self._counter += 1
        inference_id = f"inf-{self._counter}"
        detail = InferenceDetail(
            inference_id=inference_id,
            model_id=request.model_id,
            status=InferenceStatus.SUCCEEDED,
            created_at=datetime(2026, 7, 1, 12, 0, self._counter, tzinfo=UTC),
            latency_ms=120.0 + self._counter,
            total_tokens=30,
            prompt_preview=request.prompt[:140],
            prompt=request.prompt,
            system_prompt=request.system_prompt,
            output=f"[{request.model_id}] echo: {request.prompt}",
            finish_reason="stop",
            params=request.params,
            usage=TokenUsage(prompt_tokens=10, completion_tokens=20, total_tokens=30),
        )
        self._inferences[inference_id] = detail
        return detail

    async def list_inferences(self, *, limit: int) -> list[InferenceSummary]:
        summaries = [_to_inference_summary(d) for d in self._inferences.values()]
        summaries.sort(key=lambda summary: summary.created_at, reverse=True)
        return summaries[:limit]

    async def get_inference(self, inference_id: str) -> InferenceDetail:
        try:
            return self._inferences[inference_id]
        except KeyError:
            raise NotFoundError("inference", inference_id) from None


def build_client(
    fake: ModelLabClient, *, raise_app_exceptions: bool = True
) -> AsyncClient:
    """Build an httpx AsyncClient bound to the ASGI app with the fake injected.

    ``raise_app_exceptions=False`` lets tests assert the catch-all 500 handler's
    response instead of having Starlette re-raise the exception.
    """
    app = create_app()
    app.dependency_overrides[get_model_lab_client] = lambda: fake
    transport = ASGITransport(app=app, raise_app_exceptions=raise_app_exceptions)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.fixture
def fake_client() -> FakeModelLabClient:
    """A deterministic in-memory client seeded with three models."""
    return FakeModelLabClient()


@pytest.fixture
async def app_client(
    fake_client: FakeModelLabClient,
) -> AsyncGenerator[AsyncClient]:
    """An httpx AsyncClient bound to the ASGI app with the fake downstream."""
    async with build_client(fake_client) as client:
        yield client
