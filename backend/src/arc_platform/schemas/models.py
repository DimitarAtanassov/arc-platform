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


class Verdict(StrEnum):
    """Three-state evaluation rubric surfaced in the UI.

    Maps the evaluator's boolean ``passed`` + ``aggregate_score`` onto the
    BLOCKING / DEGRADING / PASS semantics researchers reason about: a clean pass,
    a passing-but-weak or mixed result (degrade), or a failure (block). ``PENDING``
    covers runs that have not completed.
    """

    PASS = "pass"  # noqa: S105 — verdict label, not a credential
    DEGRADE = "degrade"
    BLOCK = "block"
    PENDING = "pending"


class JudgeResult(BaseModel):
    """One judge's verdict within an evaluation run."""

    judge: str
    model: str | None = None
    score: float = Field(ge=0, le=1)
    passed: bool
    label: str | None = None
    explanation: str | None = None
    latency_ms: float = Field(default=0.0, ge=0)
    error: str | None = None


class EvalRunSummary(BaseModel):
    """Row-level view of an evaluation run, as shown in the Eval Runs table."""

    evaluation_id: str
    request_id: str
    status: str
    verdict: Verdict
    aggregate_score: float | None = None
    judges: list[str] = Field(default_factory=list)
    model: str | None = None
    created_at: datetime
    completed_at: datetime | None = None


class EvalRunComparison(BaseModel):
    """A prior run of the same request, for run-to-run diffing."""

    evaluation_id: str
    created_at: datetime
    verdict: Verdict
    aggregate_score: float | None = None
    results: list[JudgeResult] = Field(default_factory=list)


class EvalRunDetail(EvalRunSummary):
    """Full evaluation run: case under test, per-judge verdicts, and a diff."""

    mode: str = "sync"
    trace_id: str = ""
    input: str | None = None
    output: str | None = None
    results: list[JudgeResult] = Field(default_factory=list)
    rerun_of: str | None = None
    compare_to: EvalRunComparison | None = None


class Judge(BaseModel):
    """A registered LLM-as-judge: its rubric name and what inputs it requires."""

    name: str
    description: str
    requires: list[str] = Field(default_factory=list)


class ModelProfile(BaseModel):
    """A configured judge-model profile (no secrets)."""

    name: str
    provider: str
    model: str
    base_url: str | None = None


class InferRequest(BaseModel):
    """Playground inference request the BFF forwards to the gateway."""

    prompt: str = Field(..., min_length=1, max_length=32_000)
    model: str = "mock"
    provider: str | None = None
    system: str | None = Field(default=None, max_length=32_000)


class InferResult(BaseModel):
    """The gateway's inference outcome, surfaced to the Playground."""

    request_id: str
    trace_id: str
    response: str
    model: str
    blocked: bool = False
    block_reason: str | None = None
    scores: dict[str, float] = Field(default_factory=dict)


class ProviderInfo(BaseModel):
    """A provider the gateway can serve and whether it has a usable key."""

    name: str
    configured: bool
    models: list[str] = Field(default_factory=list)


class HealthResponse(BaseModel):
    """Liveness response."""

    status: str = "ok"
    service: str
