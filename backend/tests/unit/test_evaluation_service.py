"""Unit tests for the evaluation aggregation service."""

import pytest

from arc_platform.db.store import MockDataStore
from arc_platform.services.evaluations import EvaluationService

pytestmark = pytest.mark.unit


def test_summary_totals_match_store(store: MockDataStore) -> None:
    service = EvaluationService(store)
    summary = service.summary()
    assert summary.total_evaluations == len(store.list_evaluations())


def test_summary_metrics_are_consistent(store: MockDataStore) -> None:
    service = EvaluationService(store)
    summary = service.summary()

    assert summary.metrics
    for metric in summary.metrics:
        assert metric.total > 0
        assert 0 <= metric.passed <= metric.total
        assert 0.0 <= metric.pass_rate <= 1.0
        assert 0.0 <= metric.average_score <= 1.0
        assert metric.pass_rate == pytest.approx(metric.passed / metric.total, abs=1e-3)

    # Per-metric totals sum to the grand total.
    assert sum(m.total for m in summary.metrics) == summary.total_evaluations


def test_summary_handles_empty_store() -> None:
    empty = MockDataStore(seed=1, size=0)
    summary = EvaluationService(empty).summary()
    assert summary.total_evaluations == 0
    assert summary.metrics == []
