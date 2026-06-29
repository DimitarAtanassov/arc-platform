"""Read-only client for arc-evaluator — the platform's data source.

The platform holds no database of its own (per the design). It reads live from
the evaluator's API, which persists each scored interaction *with its case*
(prompt, response, model, latency, trace id). This module turns those records
into the request / trace / evaluation views the UI renders.

The mapping functions are pure (record dict -> UI model) so they unit-test
without HTTP. Reads degrade gracefully: if the evaluator is unreachable, list
views return empty rather than failing the page.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Protocol

import httpx
from arc_telemetry import get_logger

from arc_platform.core.errors import NotFoundError
from arc_platform.schemas.models import (
    EvaluationResult,
    RequestDetail,
    RequestStatus,
    Span,
    Trace,
)

logger = get_logger(__name__)

# Fraction of total request latency attributed to the provider call when
# reconstructing a waterfall from phase timings (the remainder is overhead).
_PROVIDER_SHARE = 0.85


class EvalReader(Protocol):
    """The read surface the platform services depend on."""

    async def list_requests(self, limit: int) -> list[RequestDetail]: ...

    async def get_request(self, request_id: str) -> RequestDetail: ...

    async def get_trace(self, trace_id: str) -> Trace: ...

    async def list_evaluations(self) -> list[EvaluationResult]: ...


# --- pure mappers (record dict -> UI model) -------------------------------


def _meta(record: dict[str, Any]) -> dict[str, str]:
    case = record.get("case") or {}
    return case.get("metadata") or {}


def has_case(record: dict[str, Any]) -> bool:
    """True when the record carries the interaction needed for request views."""
    return record.get("case") is not None


def record_to_detail(record: dict[str, Any]) -> RequestDetail:
    """Map an evaluation record to a full request inspection payload."""
    case = record["case"]
    meta = _meta(record)
    status = (
        RequestStatus.OK if meta.get("status", "ok") == "ok" else RequestStatus.ERROR
    )
    return RequestDetail(
        request_id=record["request_id"],
        trace_id=meta.get("trace_id", ""),
        latency_ms=case.get("latency_ms") or 0.0,
        model_name=meta.get("model", "unknown"),
        timestamp=datetime.fromisoformat(record["created_at"]),
        status=status,
        prompt=meta.get("prompt", ""),
        response=case.get("output") or "",
        prompt_tokens=case.get("prompt_tokens") or 0,
        completion_tokens=case.get("completion_tokens") or 0,
    )


def record_to_trace(record: dict[str, Any]) -> Trace:
    """Reconstruct a best-effort span waterfall from a record's phase timings.

    With no collector-backed span store (the platform reads service APIs), the
    richest trace available is rebuilt from measured durations: a gateway root,
    the provider call, and one span per evaluator that ran.
    """
    meta = _meta(record)
    case = record.get("case") or {}
    total = float(case.get("latency_ms") or 0.0)
    provider_ms = round(total * _PROVIDER_SHARE, 2)

    root_id = "0" * 15 + "1"
    spans: list[Span] = [
        Span(
            span_id=root_id,
            parent_span_id=None,
            name="arc.gateway.infer",
            start_offset_ms=0.0,
            duration_ms=round(total, 2),
            attributes={"model": meta.get("model", "unknown")},
        ),
        Span(
            span_id="0" * 15 + "2",
            parent_span_id=root_id,
            name="llm.call",
            start_offset_ms=0.0,
            duration_ms=provider_ms,
            attributes={"model": meta.get("model", "unknown")},
        ),
    ]
    offset = provider_ms
    for index, result in enumerate(record.get("results", []), start=3):
        duration = float(result.get("latency_ms") or 0.0)
        spans.append(
            Span(
                span_id="0" * 15 + str(index),
                parent_span_id=root_id,
                name=f"arc.eval.{result['evaluator_name']}",
                start_offset_ms=round(offset, 2),
                duration_ms=round(duration, 2),
                attributes={"score": str(result.get("score", ""))},
            )
        )
        offset += duration

    return Trace(
        trace_id=meta.get("trace_id", ""),
        request_id=record["request_id"],
        duration_ms=round(total, 2),
        spans=spans,
    )


def record_to_eval_results(record: dict[str, Any]) -> list[EvaluationResult]:
    """Flatten a record's per-evaluator results into dashboard rows."""
    return [
        EvaluationResult(
            evaluation_id=record["evaluation_id"],
            request_id=record["request_id"],
            metric=result["evaluator_name"],
            score=result["score"],
            passed=result["passed"],
        )
        for result in record.get("results", [])
        if result.get("error") is None
    ]


# --- HTTP client ----------------------------------------------------------


class EvalServiceClient(EvalReader):
    """Polls arc-evaluator and maps records into the UI's view models."""

    # The evaluator caps GET /v1/evaluations at limit=100; stay within it.
    def __init__(
        self, *, base_url: str, fetch_limit: int = 100, timeout_s: float = 5.0
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._fetch_limit = fetch_limit
        self._timeout_s = timeout_s

    async def _fetch_records(self) -> list[dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=self._timeout_s) as client:
                resp = await client.get(
                    f"{self._base_url}/v1/evaluations",
                    params={"limit": self._fetch_limit},
                )
                resp.raise_for_status()
                records: list[dict[str, Any]] = resp.json()
                return records
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("eval_service.unreachable", error=str(exc))
            return []

    async def list_requests(self, limit: int) -> list[RequestDetail]:
        records = await self._fetch_records()
        details = [record_to_detail(r) for r in records if has_case(r)]
        details.sort(key=lambda d: d.timestamp, reverse=True)
        return details[:limit]

    async def get_request(self, request_id: str) -> RequestDetail:
        for record in await self._fetch_records():
            if record["request_id"] == request_id and has_case(record):
                return record_to_detail(record)
        raise NotFoundError("request", request_id)

    async def get_trace(self, trace_id: str) -> Trace:
        for record in await self._fetch_records():
            if _meta(record).get("trace_id") == trace_id and has_case(record):
                return record_to_trace(record)
        raise NotFoundError("trace", trace_id)

    async def list_evaluations(self) -> list[EvaluationResult]:
        results: list[EvaluationResult] = []
        for record in await self._fetch_records():
            results.extend(record_to_eval_results(record))
        return results
