"""In-memory mock data store (MVP data source).

Upstream systems (arc-gateway, evaluators) do not exist yet, so this store
generates realistic, *deterministic* request / trace / evaluation data from a
seed. Determinism keeps the UI stable across reloads and makes tests reliable.

The store seeds itself on construction if empty, satisfying the MVP rule
"generate mock request data if DB is empty".
"""

from __future__ import annotations

import random
from datetime import UTC, datetime, timedelta
from uuid import UUID

from arc_platform.core.errors import NotFoundError
from arc_platform.schemas.models import (
    EvaluationResult,
    RequestDetail,
    RequestStatus,
    Span,
    Trace,
)

_MODELS = (
    "claude-opus-4-8",
    "claude-sonnet-4-6",
    "claude-haiku-4-5",
    "gpt-mock-1",
)

_PROMPTS = (
    "Summarize the incident report for the payments outage.",
    "Draft a migration plan from the legacy router to arc-gateway.",
    "Explain the trade-offs between KISS and premature abstraction.",
    "Classify this support ticket by severity and team.",
    "Generate unit tests for the inference service.",
)

_METRICS = ("relevance", "safety", "groundedness")


class MockDataStore:
    """Holds seeded requests, traces and evaluations in memory."""

    def __init__(self, *, seed: int, size: int) -> None:
        self._requests: dict[str, RequestDetail] = {}
        self._traces: dict[str, Trace] = {}
        self._evaluations: list[EvaluationResult] = []
        self._seed_if_empty(seed=seed, size=size)

    # -- public read API ---------------------------------------------------

    def list_requests(self, limit: int) -> list[RequestDetail]:
        """Return up to ``limit`` requests, most recent first."""
        ordered = sorted(
            self._requests.values(), key=lambda r: r.timestamp, reverse=True
        )
        return ordered[:limit]

    def get_request(self, request_id: str) -> RequestDetail:
        """Return one request or raise :class:`NotFoundError`."""
        request = self._requests.get(request_id)
        if request is None:
            raise NotFoundError("request", request_id)
        return request

    def get_trace(self, trace_id: str) -> Trace:
        """Return one trace or raise :class:`NotFoundError`."""
        trace = self._traces.get(trace_id)
        if trace is None:
            raise NotFoundError("trace", trace_id)
        return trace

    def list_evaluations(self) -> list[EvaluationResult]:
        """Return every evaluation result."""
        return list(self._evaluations)

    # -- seeding -----------------------------------------------------------

    def _seed_if_empty(self, *, seed: int, size: int) -> None:
        if self._requests:
            return
        rng = random.Random(seed)  # noqa: S311 - deterministic mock data, not crypto
        base_time = datetime(2026, 6, 27, 12, 0, 0, tzinfo=UTC)
        for index in range(size):
            self._seed_one(rng=rng, base_time=base_time, index=index)

    def _seed_one(self, *, rng: random.Random, base_time: datetime, index: int) -> None:
        request_id = str(UUID(int=rng.getrandbits(128)))
        trace_id = format(rng.getrandbits(128), "032x")
        model = rng.choice(_MODELS)
        status = RequestStatus.ERROR if rng.random() < 0.12 else RequestStatus.OK
        timestamp = base_time - timedelta(seconds=index * 37)

        spans, latency_ms = _build_spans(rng=rng, model=model, status=status)
        prompt = rng.choice(_PROMPTS)
        completion_tokens = rng.randint(40, 400)

        self._traces[trace_id] = Trace(
            trace_id=trace_id,
            request_id=request_id,
            duration_ms=latency_ms,
            spans=spans,
        )
        self._requests[request_id] = RequestDetail(
            request_id=request_id,
            trace_id=trace_id,
            latency_ms=latency_ms,
            model_name=model,
            timestamp=timestamp,
            status=status,
            prompt=prompt,
            response=_mock_response(status=status, model=model),
            prompt_tokens=len(prompt.split()),
            completion_tokens=completion_tokens,
        )
        self._evaluations.extend(
            _build_evaluations(rng=rng, request_id=request_id, status=status)
        )


def _build_spans(
    *, rng: random.Random, model: str, status: RequestStatus
) -> tuple[list[Span], float]:
    """Build a request's span tree and return (spans, total latency)."""
    auth = rng.uniform(1.0, 5.0)
    queue = rng.uniform(2.0, 18.0)
    llm = rng.uniform(150.0, 1200.0)
    persist = rng.uniform(3.0, 22.0)
    total = auth + queue + llm + persist

    root_id = format(rng.getrandbits(64), "016x")
    service_id = format(rng.getrandbits(64), "016x")
    failed = status is RequestStatus.ERROR

    spans = [
        Span(
            span_id=root_id,
            parent_span_id=None,
            name="arc.gateway.request",
            start_offset_ms=0.0,
            duration_ms=round(total, 2),
            attributes={"model": model, "status": status.value},
        ),
        Span(
            span_id=format(rng.getrandbits(64), "016x"),
            parent_span_id=root_id,
            name="gateway.auth",
            start_offset_ms=0.0,
            duration_ms=round(auth, 2),
            attributes={"principal": "service-account"},
        ),
        Span(
            span_id=format(rng.getrandbits(64), "016x"),
            parent_span_id=root_id,
            name="gateway.queue",
            start_offset_ms=round(auth, 2),
            duration_ms=round(queue, 2),
            attributes={"depth": str(rng.randint(0, 8))},
        ),
        Span(
            span_id=service_id,
            parent_span_id=root_id,
            name="inference.service",
            start_offset_ms=round(auth + queue, 2),
            duration_ms=round(llm + persist, 2),
            attributes={"provider": model},
        ),
        Span(
            span_id=format(rng.getrandbits(64), "016x"),
            parent_span_id=service_id,
            name=f"llm.{model}.call",
            start_offset_ms=round(auth + queue, 2),
            duration_ms=round(llm, 2),
            attributes={
                "model": model,
                "error": "true" if failed else "false",
            },
        ),
        Span(
            span_id=format(rng.getrandbits(64), "016x"),
            parent_span_id=service_id,
            name="trace.persist",
            start_offset_ms=round(auth + queue + llm, 2),
            duration_ms=round(persist, 2),
            attributes={"sink": "mock"},
        ),
    ]
    return spans, round(total, 2)


def _build_evaluations(
    *, rng: random.Random, request_id: str, status: RequestStatus
) -> list[EvaluationResult]:
    """Build placeholder evaluation results for a request."""
    results: list[EvaluationResult] = []
    for metric in _METRICS:
        ceiling = 0.6 if status is RequestStatus.ERROR else 1.0
        score = round(rng.uniform(0.3, ceiling), 3)
        results.append(
            EvaluationResult(
                evaluation_id=format(rng.getrandbits(64), "016x"),
                request_id=request_id,
                metric=metric,
                score=score,
                passed=score >= 0.6,
            )
        )
    return results


def _mock_response(*, status: RequestStatus, model: str) -> str:
    if status is RequestStatus.ERROR:
        return f"[{model}] upstream error: provider returned 503 after retries"
    return f"[{model}] Here is a concise, grounded answer based on the prompt."
