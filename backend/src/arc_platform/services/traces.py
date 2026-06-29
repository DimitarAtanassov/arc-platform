"""Trace serving service."""

from __future__ import annotations

from arc_platform.clients.eval_service import EvalReader
from arc_platform.schemas.models import Trace


class TraceService:
    """Serves full trace trees from the evaluator-backed reader."""

    def __init__(self, reader: EvalReader) -> None:
        self._reader = reader

    async def get_trace(self, trace_id: str) -> Trace:
        """Return the full span tree for a trace."""
        return await self._reader.get_trace(trace_id)
