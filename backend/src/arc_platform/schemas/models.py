"""Domain and API models.

These are MVP-local on purpose: they are NOT extracted into a shared
``arc-contracts`` package yet (YAGNI). They describe the request / trace / span /
evaluation surface the UI renders.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class RequestStatus(StrEnum):
    """Terminal status of an inference request."""

    OK = "ok"
    ERROR = "error"


class Span(BaseModel):
    """A single node in a trace's span tree.

    Offsets are relative to the root span start so the UI can draw a waterfall
    without needing absolute wall-clock timestamps per span.
    """

    span_id: str
    parent_span_id: str | None = Field(
        default=None, description="None for the root span."
    )
    name: str
    start_offset_ms: float = Field(ge=0, description="Start, relative to trace start.")
    duration_ms: float = Field(ge=0)
    attributes: dict[str, str] = Field(default_factory=dict)


class Trace(BaseModel):
    """A full trace: the span tree for one request."""

    trace_id: str
    request_id: str
    duration_ms: float = Field(ge=0)
    spans: list[Span]


class RequestSummary(BaseModel):
    """Row-level view of a request, as shown in the request list."""

    request_id: str
    trace_id: str
    latency_ms: float = Field(ge=0)
    model_name: str
    timestamp: datetime
    status: RequestStatus


class RequestDetail(RequestSummary):
    """Full request inspection payload."""

    prompt: str
    response: str
    prompt_tokens: int = Field(ge=0)
    completion_tokens: int = Field(ge=0)


class EvaluationResult(BaseModel):
    """A single evaluation outcome for a request (placeholder logic for the MVP)."""

    evaluation_id: str
    request_id: str
    metric: str
    score: float = Field(ge=0, le=1)
    passed: bool


class MetricSummary(BaseModel):
    """Aggregated evaluation results for one metric."""

    metric: str
    total: int = Field(ge=0)
    passed: int = Field(ge=0)
    pass_rate: float = Field(ge=0, le=1)
    average_score: float = Field(ge=0, le=1)


class EvaluationSummary(BaseModel):
    """Dashboard aggregate across all evaluations."""

    total_evaluations: int = Field(ge=0)
    metrics: list[MetricSummary]


class HealthResponse(BaseModel):
    """Liveness response."""

    status: str = "ok"
    service: str
