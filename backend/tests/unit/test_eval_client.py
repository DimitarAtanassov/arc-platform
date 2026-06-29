"""Unit tests for the evaluator-backed reader (HTTP wire + mapping + degrade)."""

from typing import Any

import httpx
import pytest
import respx

from arc_platform.clients.eval_service import EvalServiceClient
from arc_platform.core.errors import NotFoundError

pytestmark = pytest.mark.unit

_BASE = "http://eval"
_URL = f"{_BASE}/v1/evaluations"


def _record(index: int) -> dict[str, Any]:
    request_id = f"req-{index}"
    return {
        "evaluation_id": f"eval-{index}",
        "request_id": request_id,
        "status": "completed",
        "mode": "sync",
        "aggregate_score": 0.9,
        "passed": True,
        "created_at": f"2026-06-2{index % 9}T12:00:00+00:00",
        "completed_at": None,
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
                "trace_id": f"{index:032x}",
                "status": "ok",
            },
        },
    }


@respx.mock
async def test_list_requests_maps_records() -> None:
    respx.get(_URL).mock(
        return_value=httpx.Response(200, json=[_record(i) for i in range(3)])
    )
    client = EvalServiceClient(base_url=_BASE)
    rows = await client.list_requests(limit=10)
    assert len(rows) == 3
    assert rows[0].model_name == "mock"
    assert rows[0].prompt.startswith("prompt")


@respx.mock
async def test_get_request_and_trace_roundtrip() -> None:
    respx.get(_URL).mock(return_value=httpx.Response(200, json=[_record(1)]))
    client = EvalServiceClient(base_url=_BASE)
    detail = await client.get_request("req-1")
    trace = await client.get_trace(detail.trace_id)
    assert detail.request_id == "req-1"
    assert trace.request_id == "req-1"
    assert trace.spans[0].name == "arc.gateway.infer"
    assert trace.spans[0].parent_span_id is None


@respx.mock
async def test_get_request_unknown_raises() -> None:
    respx.get(_URL).mock(return_value=httpx.Response(200, json=[_record(1)]))
    client = EvalServiceClient(base_url=_BASE)
    with pytest.raises(NotFoundError):
        await client.get_request("missing")


@respx.mock
async def test_reads_degrade_when_evaluator_unreachable() -> None:
    respx.get(_URL).mock(return_value=httpx.Response(503))
    client = EvalServiceClient(base_url=_BASE)
    assert await client.list_requests(10) == []
    assert await client.list_evaluations() == []
