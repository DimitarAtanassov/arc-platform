"""Unit tests for the trace service (fake evaluator-backed reader)."""

import pytest

from arc_platform.clients.eval_service import EvalReader
from arc_platform.core.errors import NotFoundError
from arc_platform.services.requests import RequestService
from arc_platform.services.traces import TraceService

pytestmark = pytest.mark.unit


async def test_get_trace_returns_span_tree(reader: EvalReader) -> None:
    request = (await RequestService(reader).list_recent(1))[0]
    trace = await TraceService(reader).get_trace(request.trace_id)
    assert trace.trace_id == request.trace_id
    assert len(trace.spans) >= 1
    assert sum(1 for s in trace.spans if s.parent_span_id is None) == 1


async def test_get_trace_unknown_raises(reader: EvalReader) -> None:
    service = TraceService(reader)
    with pytest.raises(NotFoundError):
        await service.get_trace("missing")
