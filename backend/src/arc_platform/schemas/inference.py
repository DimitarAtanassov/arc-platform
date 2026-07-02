"""Inference contracts.

The BFF's public shape for running and reading model inference. arc-model-lab
persists every run; the BFF stores nothing and simply normalizes the records.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import Field

from arc_platform.schemas.base import CamelModel


class InferenceStatus(StrEnum):
    """Terminal or in-flight state of an inference run."""

    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class InferenceParams(CamelModel):
    """Sampling parameters for one generation.

    All optional: an omitted value defers to arc-model-lab's model default.
    """

    temperature: float | None = Field(default=None, ge=0.0, le=2.0)
    max_tokens: int | None = Field(default=None, ge=1)
    top_p: float | None = Field(default=None, ge=0.0, le=1.0)


class TokenUsage(CamelModel):
    """Token accounting for one inference run."""

    prompt_tokens: int = Field(default=0, ge=0)
    completion_tokens: int = Field(default=0, ge=0)
    total_tokens: int = Field(default=0, ge=0)


class InferenceRequest(CamelModel):
    """Inbound request from the browser to run one inference."""

    model_id: str = Field(min_length=1, max_length=200)
    prompt: str = Field(min_length=1, max_length=32_000)
    system_prompt: str | None = Field(default=None, max_length=32_000)
    params: InferenceParams = Field(default_factory=InferenceParams)


class InferenceSummary(CamelModel):
    """Row-level view of an inference run, as shown in the history table."""

    inference_id: str
    model_id: str
    status: InferenceStatus
    created_at: datetime
    latency_ms: float | None = Field(default=None, ge=0)
    total_tokens: int | None = Field(default=None, ge=0)
    prompt_preview: str


class InferenceDetail(InferenceSummary):
    """Full inference record: prompt, output, usage, params, and any error."""

    prompt: str
    system_prompt: str | None = None
    output: str | None = None
    finish_reason: str | None = None
    params: InferenceParams = Field(default_factory=InferenceParams)
    usage: TokenUsage | None = None
    error: str | None = None
