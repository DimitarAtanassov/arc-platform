"""Shared test fixtures.

The platform reads from arc-evaluator. Tests inject a ``FakeReader`` (built from
canned evaluation records) so neither unit nor API tests need a live evaluator.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from arc_platform.api.main import create_app
from arc_platform.clients.eval_service import (
    EvalReader,
    _previous_run,
    record_to_detail,
    record_to_eval_results,
    record_to_run_detail,
    record_to_run_summary,
)
from arc_platform.core.deps import get_eval_reader, get_gateway_client
from arc_platform.core.errors import NotFoundError, UpstreamError
from arc_platform.schemas.models import (
    EvalRunDetail,
    EvalRunSummary,
    EvaluationResult,
    InferRequest,
    InferResult,
    Judge,
    ModelProfile,
    ProviderInfo,
    RequestDetail,
    Span,
    Trace,
)


def make_record(index: int) -> dict[str, Any]:
    """Build one canned evaluation record (as the evaluator API returns it)."""
    request_id = f"req-{index}"
    trace_id = f"{index:032x}"
    return {
        "evaluation_id": f"eval-{index}",
        "request_id": request_id,
        "status": "completed",
        "mode": "sync",
        "aggregate_score": 0.9,
        "passed": True,
        "created_at": f"2026-06-2{index % 9}T12:00:00+00:00",
        "completed_at": f"2026-06-2{index % 9}T12:00:01+00:00",
        "results": [
            {
                "evaluator_name": "heuristic",
                "score": 0.9,
                "passed": True,
                "latency_ms": 1.5,
                "error": None,
            }
        ],
        "case": {
            "request_id": request_id,
            "output": f"answer {index}",
            "latency_ms": 100.0 + index,
            "prompt_tokens": 5,
            "completion_tokens": 7,
            "metadata": {
                "model": "mock",
                "prompt": f"prompt {index}",
                "trace_id": trace_id,
                "status": "ok",
            },
        },
    }


def make_trace(record: dict[str, Any]) -> Trace:
    """Build a real-shaped trace as the evaluator's span store now serves it.

    Carries the arc.llm.* (inference) and arc.eval.* (evaluation) attributes the
    inspector renders -- real spans, not a waterfall reconstructed from latencies.
    Duration mirrors the record's latency so request/trace views stay consistent.
    """
    case = record["case"]
    meta = case["metadata"]
    model = meta.get("model", "unknown")
    total = float(case.get("latency_ms") or 0.0)
    root = Span(
        span_id="span-root",
        parent_span_id=None,
        name="arc.gateway.infer",
        start_offset_ms=0.0,
        duration_ms=total,
        attributes={"arc.request_id": record["request_id"]},
    )
    llm = Span(
        span_id="span-llm",
        parent_span_id="span-root",
        name="arc.llm.call",
        start_offset_ms=5.0,
        duration_ms=max(total - 30.0, 0.0),
        attributes={
            "arc.llm.request.model": model,
            "arc.llm.usage.input_tokens": "42",
        },
    )
    evaluation = Span(
        span_id="span-eval",
        parent_span_id="span-root",
        name="arc.evaluation.run",
        start_offset_ms=max(total - 15.0, 0.0),
        duration_ms=15.0,
        attributes={"arc.eval.name": "safety", "arc.eval.score": "0.9"},
    )
    return Trace(
        trace_id=meta["trace_id"],
        request_id=record["request_id"],
        duration_ms=total,
        spans=[root, llm, evaluation],
    )


class FakeReader(EvalReader):
    """In-memory reader backed by canned records (mirrors EvalServiceClient)."""

    def __init__(self, count: int = 6) -> None:
        self._records = [make_record(i) for i in range(count)]

    async def list_requests(self, limit: int) -> list[RequestDetail]:
        details = [record_to_detail(r) for r in self._records]
        details.sort(key=lambda d: d.timestamp, reverse=True)
        return details[:limit]

    async def get_request(self, request_id: str) -> RequestDetail:
        for record in self._records:
            if record["request_id"] == request_id:
                return record_to_detail(record)
        raise NotFoundError("request", request_id)

    async def get_trace(self, trace_id: str) -> Trace:
        for record in self._records:
            if record["case"]["metadata"]["trace_id"] == trace_id:
                return make_trace(record)
        raise NotFoundError("trace", trace_id)

    async def list_evaluations(self) -> list[EvaluationResult]:
        results: list[EvaluationResult] = []
        for record in self._records:
            results.extend(record_to_eval_results(record))
        return results

    async def list_eval_runs(self, limit: int) -> list[EvalRunSummary]:
        runs = [record_to_run_summary(r) for r in self._records]
        runs.sort(key=lambda r: r.created_at, reverse=True)
        return runs[:limit]

    async def get_eval_run(self, evaluation_id: str) -> EvalRunDetail:
        for record in self._records:
            if record["evaluation_id"] == evaluation_id:
                return record_to_run_detail(
                    record, _previous_run(self._records, record)
                )
        raise NotFoundError("eval run", evaluation_id)

    async def delete_eval_run(self, evaluation_id: str) -> None:
        for i, record in enumerate(self._records):
            if record["evaluation_id"] == evaluation_id:
                del self._records[i]
                return
        raise NotFoundError("eval run", evaluation_id)

    async def list_judges(self) -> list[Judge]:
        return [
            Judge(
                name="safety",
                description="Flags unsafe or policy-violating responses.",
                requires=["output"],
            ),
            Judge(
                name="groundedness",
                description="Checks the answer is supported by context.",
                requires=["output", "context"],
            ),
        ]

    async def list_models(self) -> list[ModelProfile]:
        return [
            ModelProfile(
                name="default",
                provider="anthropic",
                model="claude-haiku-4-5",
                base_url=None,
            )
        ]


class FakeGateway:
    """In-memory gateway (satisfies the GatewayPort protocol)."""

    def __init__(self, *, fail: bool = False) -> None:
        self._fail = fail
        self.calls: list[InferRequest] = []

    async def infer(self, request: InferRequest) -> InferResult:
        self.calls.append(request)
        if self._fail:
            raise UpstreamError("gateway", "boom")
        return InferResult(
            request_id="req-x",
            trace_id="0" * 32,
            response=f"[{request.provider or 'mock'}] {request.prompt}",
            model=request.model,
            scores={"safety": 1.0},
        )

    async def list_providers(self) -> list[ProviderInfo]:
        return [
            ProviderInfo(name="mock", configured=True, models=["mock"]),
            ProviderInfo(
                name="anthropic", configured=True, models=["claude-haiku-4-5"]
            ),
        ]


@pytest.fixture
def reader() -> FakeReader:
    """A small, deterministic reader for unit tests."""
    return FakeReader(count=6)


@pytest.fixture
def gateway() -> FakeGateway:
    """A fake gateway for Playground tests (no network)."""
    return FakeGateway()


@pytest.fixture
async def client(
    reader: FakeReader, gateway: FakeGateway
) -> AsyncGenerator[AsyncClient]:
    """An httpx AsyncClient bound to the ASGI app, with fakes for both upstreams."""
    app = create_app()
    app.dependency_overrides[get_eval_reader] = lambda: reader
    app.dependency_overrides[get_gateway_client] = lambda: gateway
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client
    app.dependency_overrides.clear()
