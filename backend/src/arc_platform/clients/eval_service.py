"""Read-only client for arc-evaluator — the platform's data source.

The platform holds no database of its own (per the design). It reads live from
the evaluator's API, which persists each scored interaction *with its case*
(prompt, response, model, latency, trace id). This module turns those records
into the request / trace / evaluation / run views the UI renders.

The mapping functions are pure (record dict -> UI model) so they unit-test
without HTTP. They are deliberately **tolerant** of the evaluator's record shape:
the gateway writes the prompt to ``case.input`` and judge results under
``result.judge``, while older/canned records used ``metadata.prompt`` and
``evaluator_name`` — both are accepted. Reads degrade gracefully: if the
evaluator is unreachable, list views return empty rather than failing the page.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Protocol

import httpx
from arc_telemetry import get_logger

from arc_platform.core.errors import NotFoundError
from arc_platform.schemas.models import (
    EvalRunComparison,
    EvalRunDetail,
    EvalRunSummary,
    EvaluationResult,
    Judge,
    JudgeResult,
    ModelProfile,
    RequestDetail,
    RequestStatus,
    Trace,
    Verdict,
)

logger = get_logger(__name__)

# A passing run whose aggregate score is below this reads as DEGRADE, not PASS.
_DEGRADE_THRESHOLD = 0.85


class EvalReader(Protocol):
    """The read surface the platform services depend on."""

    async def list_requests(self, limit: int) -> list[RequestDetail]: ...

    async def get_request(self, request_id: str) -> RequestDetail: ...

    async def get_trace(self, trace_id: str) -> Trace: ...

    async def list_evaluations(self) -> list[EvaluationResult]: ...

    async def list_eval_runs(self, limit: int) -> list[EvalRunSummary]: ...

    async def get_eval_run(self, evaluation_id: str) -> EvalRunDetail: ...

    async def list_judges(self) -> list[Judge]: ...

    async def list_models(self) -> list[ModelProfile]: ...


# --- pure mappers (record dict -> UI model) -------------------------------


def _meta(record: dict[str, Any]) -> dict[str, str]:
    case = record.get("case") or {}
    return case.get("metadata") or {}


def has_case(record: dict[str, Any]) -> bool:
    """True when the record carries the interaction needed for request views."""
    return record.get("case") is not None


def _judge_name(result: dict[str, Any]) -> str:
    """Judge identity, tolerant of both real (``judge``) and canned shapes."""
    return result.get("judge") or result.get("evaluator_name") or "unknown"


def _latency_ms(record: dict[str, Any]) -> float:
    """Total request latency, from metadata (real) or the case (canned)."""
    case = record.get("case") or {}
    meta = _meta(record)
    raw = meta.get("latency_ms") or case.get("latency_ms") or 0.0
    try:
        return float(raw)
    except (TypeError, ValueError):
        return 0.0


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
        latency_ms=_latency_ms(record),
        model_name=meta.get("model", "unknown"),
        timestamp=datetime.fromisoformat(record["created_at"]),
        status=status,
        prompt=case.get("input") or meta.get("prompt", ""),
        response=case.get("output") or "",
        prompt_tokens=case.get("prompt_tokens") or 0,
        completion_tokens=case.get("completion_tokens") or 0,
    )


def record_to_eval_results(record: dict[str, Any]) -> list[EvaluationResult]:
    """Flatten a record's per-judge results into dashboard rows."""
    return [
        EvaluationResult(
            evaluation_id=record["evaluation_id"],
            request_id=record["request_id"],
            metric=_judge_name(result),
            score=result["score"],
            passed=result["passed"],
        )
        for result in record.get("results", [])
        if result.get("error") is None
    ]


def _verdict(record: dict[str, Any]) -> Verdict:
    """Map ``passed`` + ``aggregate_score`` + mixed results to a 3-state verdict."""
    if record.get("status") != "completed" or record.get("passed") is None:
        return Verdict.PENDING
    if record.get("passed") is False:
        return Verdict.BLOCK
    score = record.get("aggregate_score")
    if score is not None and float(score) < _DEGRADE_THRESHOLD:
        return Verdict.DEGRADE
    results = record.get("results") or []
    if any(r.get("passed") is False for r in results if r.get("error") is None):
        return Verdict.DEGRADE
    return Verdict.PASS


def _judge_results(record: dict[str, Any]) -> list[JudgeResult]:
    return [
        JudgeResult(
            judge=_judge_name(result),
            model=result.get("model"),
            score=result.get("score", 0.0),
            passed=bool(result.get("passed")),
            label=result.get("label"),
            explanation=result.get("explanation"),
            latency_ms=float(result.get("latency_ms") or 0.0),
            error=result.get("error"),
        )
        for result in record.get("results", [])
    ]


def record_to_run_summary(record: dict[str, Any]) -> EvalRunSummary:
    """Map a record to a row in the Eval Runs table."""
    return EvalRunSummary(
        evaluation_id=record["evaluation_id"],
        request_id=record["request_id"],
        status=record.get("status", "completed"),
        verdict=_verdict(record),
        aggregate_score=record.get("aggregate_score"),
        judges=[_judge_name(r) for r in record.get("results", [])],
        model=_meta(record).get("model"),
        created_at=datetime.fromisoformat(record["created_at"]),
        completed_at=(
            datetime.fromisoformat(record["completed_at"])
            if record.get("completed_at")
            else None
        ),
    )


def record_to_run_detail(
    record: dict[str, Any], previous: dict[str, Any] | None
) -> EvalRunDetail:
    """Map a record to a full run detail, with an optional prior run to diff."""
    case = record.get("case") or {}
    meta = _meta(record)
    compare_to = None
    if previous is not None:
        compare_to = EvalRunComparison(
            evaluation_id=previous["evaluation_id"],
            created_at=datetime.fromisoformat(previous["created_at"]),
            verdict=_verdict(previous),
            aggregate_score=previous.get("aggregate_score"),
            results=_judge_results(previous),
        )
    return EvalRunDetail(
        evaluation_id=record["evaluation_id"],
        request_id=record["request_id"],
        status=record.get("status", "completed"),
        verdict=_verdict(record),
        aggregate_score=record.get("aggregate_score"),
        judges=[_judge_name(r) for r in record.get("results", [])],
        model=meta.get("model"),
        created_at=datetime.fromisoformat(record["created_at"]),
        completed_at=(
            datetime.fromisoformat(record["completed_at"])
            if record.get("completed_at")
            else None
        ),
        mode=record.get("mode", "sync"),
        trace_id=meta.get("trace_id", ""),
        input=case.get("input") or meta.get("prompt"),
        output=case.get("output"),
        results=_judge_results(record),
        rerun_of=record.get("rerun_of"),
        compare_to=compare_to,
    )


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

    async def _get(
        self, path: str, params: dict[str, str | int] | None = None
    ) -> object:
        try:
            async with httpx.AsyncClient(timeout=self._timeout_s) as client:
                resp = await client.get(f"{self._base_url}{path}", params=params)
                resp.raise_for_status()
                return resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("eval_service.unreachable", path=path, error=str(exc))
            return None

    async def _fetch_records(self) -> list[dict[str, Any]]:
        data = await self._get("/v1/evaluations", {"limit": self._fetch_limit})
        return data if isinstance(data, list) else []

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
        data = await self._get(f"/v1/traces/{trace_id}")
        if not isinstance(data, dict):
            raise NotFoundError("trace", trace_id)
        return Trace.model_validate(data)

    async def list_evaluations(self) -> list[EvaluationResult]:
        results: list[EvaluationResult] = []
        for record in await self._fetch_records():
            results.extend(record_to_eval_results(record))
        return results

    async def list_eval_runs(self, limit: int) -> list[EvalRunSummary]:
        records = await self._fetch_records()
        runs = [record_to_run_summary(r) for r in records]
        runs.sort(key=lambda r: r.created_at, reverse=True)
        return runs[:limit]

    async def get_eval_run(self, evaluation_id: str) -> EvalRunDetail:
        records = await self._fetch_records()
        target = next((r for r in records if r["evaluation_id"] == evaluation_id), None)
        if target is None:
            raise NotFoundError("eval run", evaluation_id)
        previous = _previous_run(records, target)
        return record_to_run_detail(target, previous)

    async def list_judges(self) -> list[Judge]:
        data = await self._get("/v1/judges")
        if not isinstance(data, list):
            return []
        return [
            Judge(
                name=j["name"],
                description=j.get("description", ""),
                requires=j.get("requires", []),
            )
            for j in data
        ]

    async def list_models(self) -> list[ModelProfile]:
        data = await self._get("/v1/models")
        if not isinstance(data, list):
            return []
        return [
            ModelProfile(
                name=m["name"],
                provider=m.get("provider", "unknown"),
                model=m.get("model", ""),
                base_url=m.get("base_url"),
            )
            for m in data
        ]


def _previous_run(
    records: list[dict[str, Any]], target: dict[str, Any]
) -> dict[str, Any] | None:
    """The most recent earlier run of the same request, for diffing."""
    target_time = datetime.fromisoformat(target["created_at"])
    candidates = [
        r
        for r in records
        if r["request_id"] == target["request_id"]
        and r["evaluation_id"] != target["evaluation_id"]
        and datetime.fromisoformat(r["created_at"]) < target_time
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda r: datetime.fromisoformat(r["created_at"]))
