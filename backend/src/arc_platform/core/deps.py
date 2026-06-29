"""Dependency injection wiring.

The api/ layer depends on these factories rather than constructing the reader or
services directly. This keeps layering (api -> services -> client) one-directional
and makes the data source swappable behind ``get_eval_reader``.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from arc_platform.clients.eval_service import EvalReader, EvalServiceClient
from arc_platform.core.config import get_settings
from arc_platform.services.evaluations import EvaluationService
from arc_platform.services.requests import RequestService
from arc_platform.services.traces import TraceService


@lru_cache(maxsize=1)
def get_eval_reader() -> EvalReader:
    """Return the process-wide evaluator-backed reader (the platform's data source)."""
    settings = get_settings()
    return EvalServiceClient(
        base_url=settings.evaluator_url, timeout_s=settings.evaluator_timeout_s
    )


ReaderDep = Annotated[EvalReader, Depends(get_eval_reader)]


def get_request_service(reader: ReaderDep) -> RequestService:
    """Return a :class:`RequestService` wired to the active reader."""
    return RequestService(reader=reader)


def get_trace_service(reader: ReaderDep) -> TraceService:
    """Return a :class:`TraceService` wired to the active reader."""
    return TraceService(reader=reader)


def get_evaluation_service(reader: ReaderDep) -> EvaluationService:
    """Return an :class:`EvaluationService` wired to the active reader."""
    return EvaluationService(reader=reader)
