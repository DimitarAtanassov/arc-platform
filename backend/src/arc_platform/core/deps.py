"""Dependency injection wiring.

The api/ layer depends on these factories rather than constructing the store or
services directly. This keeps layering (api -> services -> db) one-directional
and makes the data source swappable behind ``get_store``.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from arc_platform.core.config import get_settings
from arc_platform.db.store import MockDataStore
from arc_platform.services.evaluations import EvaluationService
from arc_platform.services.requests import RequestService
from arc_platform.services.traces import TraceService


@lru_cache(maxsize=1)
def get_store() -> MockDataStore:
    """Return the process-wide data store (seeded mock data for the MVP)."""
    settings = get_settings()
    return MockDataStore(seed=settings.mock_seed, size=settings.mock_request_count)


StoreDep = Annotated[MockDataStore, Depends(get_store)]


def get_request_service(store: StoreDep) -> RequestService:
    """Return a :class:`RequestService` wired to the active store."""
    return RequestService(store=store)


def get_trace_service(store: StoreDep) -> TraceService:
    """Return a :class:`TraceService` wired to the active store."""
    return TraceService(store=store)


def get_evaluation_service(store: StoreDep) -> EvaluationService:
    """Return an :class:`EvaluationService` wired to the active store."""
    return EvaluationService(store=store)
