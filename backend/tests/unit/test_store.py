"""Unit tests for the mock data store."""

import pytest

from arc_platform.core.errors import NotFoundError
from arc_platform.db.store import MockDataStore

pytestmark = pytest.mark.unit


def test_seeds_requested_size() -> None:
    store = MockDataStore(seed=1, size=7)
    assert len(store.list_requests(100)) == 7


def test_seeding_is_deterministic_for_same_seed() -> None:
    first = MockDataStore(seed=99, size=5).list_requests(100)
    second = MockDataStore(seed=99, size=5).list_requests(100)
    assert [r.request_id for r in first] == [r.request_id for r in second]


def test_different_seeds_differ() -> None:
    first = MockDataStore(seed=1, size=5).list_requests(100)
    second = MockDataStore(seed=2, size=5).list_requests(100)
    assert [r.request_id for r in first] != [r.request_id for r in second]


def test_requests_are_sorted_recent_first() -> None:
    store = MockDataStore(seed=3, size=8)
    timestamps = [r.timestamp for r in store.list_requests(100)]
    assert timestamps == sorted(timestamps, reverse=True)


def test_list_requests_respects_limit() -> None:
    store = MockDataStore(seed=3, size=8)
    assert len(store.list_requests(3)) == 3


def test_every_request_has_a_matching_trace() -> None:
    store = MockDataStore(seed=5, size=6)
    for request in store.list_requests(100):
        trace = store.get_trace(request.trace_id)
        assert trace.request_id == request.request_id
        assert trace.duration_ms == request.latency_ms


def test_trace_has_single_root_and_no_orphans() -> None:
    store = MockDataStore(seed=5, size=4)
    request = store.list_requests(1)[0]
    trace = store.get_trace(request.trace_id)

    roots = [s for s in trace.spans if s.parent_span_id is None]
    assert len(roots) == 1

    ids = {s.span_id for s in trace.spans}
    for span in trace.spans:
        if span.parent_span_id is not None:
            assert span.parent_span_id in ids


def test_get_request_unknown_raises_not_found() -> None:
    store = MockDataStore(seed=1, size=2)
    with pytest.raises(NotFoundError):
        store.get_request("does-not-exist")


def test_get_trace_unknown_raises_not_found() -> None:
    store = MockDataStore(seed=1, size=2)
    with pytest.raises(NotFoundError):
        store.get_trace("does-not-exist")


def test_evaluations_exist_for_each_request() -> None:
    store = MockDataStore(seed=7, size=4)
    request_ids = {r.request_id for r in store.list_requests(100)}
    evaluated_ids = {e.request_id for e in store.list_evaluations()}
    assert request_ids == evaluated_ids
