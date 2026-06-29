"""Eval run serving service.

Runs (and their run-to-run diff) are mapped from the evaluator's evaluation
records by the reader; this service only bounds the list and delegates, keeping
the api -> services -> client layering one-directional.
"""

from __future__ import annotations

from arc_platform.clients.eval_service import EvalReader
from arc_platform.schemas.models import EvalRunDetail, EvalRunSummary

DEFAULT_LIMIT = 50
MAX_LIMIT = 200


class EvalRunService:
    """Serves the Eval Runs table and per-run detail (with diff)."""

    def __init__(self, reader: EvalReader) -> None:
        self._reader = reader

    async def list_recent(self, limit: int = DEFAULT_LIMIT) -> list[EvalRunSummary]:
        """Return recent evaluation runs (most recent first)."""
        bounded = max(1, min(limit, MAX_LIMIT))
        return await self._reader.list_eval_runs(bounded)

    async def get_detail(self, evaluation_id: str) -> EvalRunDetail:
        """Return one run with its per-judge verdicts and a diff to the prior run."""
        return await self._reader.get_eval_run(evaluation_id)
