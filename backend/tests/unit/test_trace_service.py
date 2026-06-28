"""Unit tests for the trace service."""

import pytest

from arc_platform.core.errors import NotFoundError
from arc_platform.db.store import MockDataStore
from arc_platform.services.traces import TraceService

pytestmark = pytest.mark.unit


def test_get_trace_returns_span_tree(store: MockDataStore) -> None:
    service = TraceService(store)
    request = store.list_requests(1)[0]
    trace = service.get_trace(request.trace_id)
    assert trace.trace_id == request.trace_id
    assert len(trace.spans) >= 1


def test_get_trace_unknown_raises(store: MockDataStore) -> None:
    service = TraceService(store)
    with pytest.raises(NotFoundError):
        service.get_trace("missing")
