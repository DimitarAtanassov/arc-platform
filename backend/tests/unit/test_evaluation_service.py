"""Unit tests for the evaluation aggregation service."""

from typing import NoReturn

import pytest

from arc_platform.clients.eval_service import EvalReader
from arc_platform.schemas.models import (
    EvalRunDetail,
    EvalRunSummary,
    EvaluationResult,
    Judge,
    ModelProfile,
    RequestDetail,
)
from arc_platform.services.evaluations import EvaluationService

pytestmark = pytest.mark.unit


async def test_summary_totals_match_reader(reader: EvalReader) -> None:
    service = EvaluationService(reader)
    summary = await service.summary()
    assert summary.total_evaluations == len(await reader.list_evaluations())


async def test_summary_metrics_are_consistent(reader: EvalReader) -> None:
    summary = await EvaluationService(reader).summary()

    assert summary.metrics
    for metric in summary.metrics:
        assert metric.total > 0
        assert 0 <= metric.passed <= metric.total
        assert 0.0 <= metric.pass_rate <= 1.0
        assert 0.0 <= metric.average_score <= 1.0
        assert metric.pass_rate == pytest.approx(metric.passed / metric.total, abs=1e-3)

    assert sum(m.total for m in summary.metrics) == summary.total_evaluations


class _EmptyReader:
    """A reader with no data (satisfies the EvalReader protocol)."""

    async def list_requests(self, limit: int) -> list[RequestDetail]:
        return []

    async def get_request(self, request_id: str) -> NoReturn:
        raise AssertionError

    async def get_trace(self, trace_id: str) -> NoReturn:
        raise AssertionError

    async def list_evaluations(self) -> list[EvaluationResult]:
        return []

    async def list_eval_runs(self, limit: int) -> list[EvalRunSummary]:
        return []

    async def get_eval_run(self, evaluation_id: str) -> EvalRunDetail:
        raise AssertionError

    async def delete_eval_run(self, evaluation_id: str) -> NoReturn:
        raise AssertionError

    async def list_judges(self) -> list[Judge]:
        return []

    async def list_models(self) -> list[ModelProfile]:
        return []


async def test_summary_handles_empty_reader() -> None:
    summary = await EvaluationService(_EmptyReader()).summary()
    assert summary.total_evaluations == 0
    assert summary.metrics == []
