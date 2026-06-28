"""Trace serving service."""

from __future__ import annotations

from arc_platform.db.store import MockDataStore
from arc_platform.schemas.models import Trace


class TraceService:
    """Serves full trace trees from the data store."""

    def __init__(self, store: MockDataStore) -> None:
        self._store = store

    def get_trace(self, trace_id: str) -> Trace:
        """Return the full span tree for a trace."""
        return self._store.get_trace(trace_id)
