"""Evaluation aggregation service.

Scoring itself lives in arc-evaluator; this service only *aggregates* the
results the evaluator-backed reader provides, for the dashboard.
"""

from __future__ import annotations

from collections import defaultdict

from arc_platform.clients.eval_service import EvalReader
from arc_platform.schemas.models import (
    EvaluationResult,
    EvaluationSummary,
    MetricSummary,
)


class EvaluationService:
    """Aggregates evaluation results into dashboard summaries."""

    def __init__(self, reader: EvalReader) -> None:
        self._reader = reader

    async def summary(self) -> EvaluationSummary:
        """Aggregate per-metric pass rate and average score."""
        results = await self._reader.list_evaluations()
        grouped: dict[str, list[EvaluationResult]] = defaultdict(list)
        for result in results:
            grouped[result.metric].append(result)

        metrics = [
            _summarize_metric(metric, items)
            for metric, items in sorted(grouped.items())
        ]
        return EvaluationSummary(total_evaluations=len(results), metrics=metrics)


def _summarize_metric(metric: str, items: list[EvaluationResult]) -> MetricSummary:
    total = len(items)
    passed = sum(1 for item in items if item.passed)
    avg_score = sum(item.score for item in items) / total if total else 0.0
    return MetricSummary(
        metric=metric,
        total=total,
        passed=passed,
        pass_rate=round(passed / total, 4) if total else 0.0,
        average_score=round(avg_score, 4),
    )
