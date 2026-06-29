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
    record_to_detail,
    record_to_eval_results,
    record_to_trace,
)
from arc_platform.core.deps import get_eval_reader
from arc_platform.core.errors import NotFoundError
from arc_platform.schemas.models import (
    EvaluationResult,
    RequestDetail,
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
                return record_to_trace(record)
        raise NotFoundError("trace", trace_id)

    async def list_evaluations(self) -> list[EvaluationResult]:
        results: list[EvaluationResult] = []
        for record in self._records:
            results.extend(record_to_eval_results(record))
        return results


@pytest.fixture
def reader() -> FakeReader:
    """A small, deterministic reader for unit tests."""
    return FakeReader(count=6)


@pytest.fixture
async def client(reader: FakeReader) -> AsyncGenerator[AsyncClient]:
    """An httpx AsyncClient bound to the ASGI app, reading from the fake reader."""
    app = create_app()
    app.dependency_overrides[get_eval_reader] = lambda: reader
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client
    app.dependency_overrides.clear()
