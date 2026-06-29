"""Unit tests for eval-run mapping: verdict derivation and run-to-run diff."""

from __future__ import annotations

from typing import Any

import httpx
import pytest
import respx

from arc_platform.clients.eval_service import (
    EvalServiceClient,
    record_to_run_detail,
    record_to_run_summary,
)
from arc_platform.schemas.models import Verdict

pytestmark = pytest.mark.unit


def _record(
    *,
    eval_id: str,
    request_id: str,
    created: str,
    passed: bool | None,
    score: float | None,
    status: str = "completed",
    results: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "evaluation_id": eval_id,
        "request_id": request_id,
        "status": status,
        "mode": "sync",
        "aggregate_score": score,
        "passed": passed,
        "created_at": created,
        "completed_at": created,
        "results": results
        if results is not None
        else [{"judge": "safety", "score": score or 0.0, "passed": bool(passed)}],
        "case": {
            "request_id": request_id,
            "input": "prompt",
            "output": "answer",
            "metadata": {"model": "claude", "trace_id": "abc", "latency_ms": "120"},
        },
    }


def test_verdict_pass_degrade_block_pending() -> None:
    clean = _record(
        eval_id="e1",
        request_id="r1",
        created="2026-06-01T00:00:00+00:00",
        passed=True,
        score=0.95,
    )
    weak = _record(
        eval_id="e2",
        request_id="r2",
        created="2026-06-01T00:00:00+00:00",
        passed=True,
        score=0.6,
    )
    fail = _record(
        eval_id="e3",
        request_id="r3",
        created="2026-06-01T00:00:00+00:00",
        passed=False,
        score=0.2,
    )
    pend = _record(
        eval_id="e4",
        request_id="r4",
        created="2026-06-01T00:00:00+00:00",
        passed=None,
        score=None,
        status="running",
    )

    assert record_to_run_summary(clean).verdict is Verdict.PASS
    assert record_to_run_summary(weak).verdict is Verdict.DEGRADE
    assert record_to_run_summary(fail).verdict is Verdict.BLOCK
    assert record_to_run_summary(pend).verdict is Verdict.PENDING


def test_verdict_degrade_on_mixed_results() -> None:
    mixed = _record(
        eval_id="m1",
        request_id="r1",
        created="2026-06-01T00:00:00+00:00",
        passed=True,
        score=0.9,
        results=[
            {"judge": "safety", "score": 0.95, "passed": True},
            {"judge": "groundedness", "score": 0.4, "passed": False},
        ],
    )
    assert record_to_run_summary(mixed).verdict is Verdict.DEGRADE


def test_run_detail_diffs_against_prior_run() -> None:
    older = _record(
        eval_id="old",
        request_id="r1",
        created="2026-06-01T00:00:00+00:00",
        passed=True,
        score=0.95,
    )
    newer = _record(
        eval_id="new",
        request_id="r1",
        created="2026-06-02T00:00:00+00:00",
        passed=False,
        score=0.3,
    )
    detail = record_to_run_detail(newer, older)
    assert detail.compare_to is not None
    assert detail.compare_to.evaluation_id == "old"
    assert detail.compare_to.verdict is Verdict.PASS
    assert detail.verdict is Verdict.BLOCK


def test_run_detail_without_prior_run() -> None:
    only = _record(
        eval_id="only",
        request_id="r9",
        created="2026-06-01T00:00:00+00:00",
        passed=True,
        score=0.9,
    )
    detail = record_to_run_detail(only, None)
    assert detail.compare_to is None


@respx.mock
async def test_judges_and_models_passthrough() -> None:
    base = "http://eval"
    respx.get(f"{base}/v1/judges").mock(
        return_value=httpx.Response(
            200, json=[{"name": "safety", "description": "d", "requires": ["output"]}]
        )
    )
    respx.get(f"{base}/v1/models").mock(
        return_value=httpx.Response(
            200, json=[{"name": "default", "provider": "anthropic", "model": "x"}]
        )
    )
    client = EvalServiceClient(base_url=base)
    judges = await client.list_judges()
    models = await client.list_models()
    assert judges[0].name == "safety"
    assert models[0].provider == "anthropic"


@respx.mock
async def test_discovery_degrades_when_unreachable() -> None:
    base = "http://eval"
    respx.get(f"{base}/v1/judges").mock(return_value=httpx.Response(503))
    respx.get(f"{base}/v1/models").mock(return_value=httpx.Response(503))
    client = EvalServiceClient(base_url=base)
    assert await client.list_judges() == []
    assert await client.list_models() == []


@respx.mock
async def test_eval_runs_roundtrip_over_http() -> None:
    base = "http://eval"
    records = [
        _record(
            eval_id="old",
            request_id="r1",
            created="2026-06-01T00:00:00+00:00",
            passed=True,
            score=0.95,
        ),
        _record(
            eval_id="new",
            request_id="r1",
            created="2026-06-02T00:00:00+00:00",
            passed=False,
            score=0.3,
        ),
    ]
    respx.get(f"{base}/v1/evaluations").mock(
        return_value=httpx.Response(200, json=records)
    )
    client = EvalServiceClient(base_url=base)
    runs = await client.list_eval_runs(limit=10)
    assert runs[0].evaluation_id == "new"  # most recent first
    detail = await client.get_eval_run("new")
    assert detail.compare_to is not None
    assert detail.compare_to.evaluation_id == "old"
