"""Unit tests for the request service."""

import pytest

from arc_platform.core.errors import NotFoundError
from arc_platform.db.store import MockDataStore
from arc_platform.schemas.models import RequestDetail, RequestSummary
from arc_platform.services.requests import RequestService

pytestmark = pytest.mark.unit


def test_list_recent_returns_summaries(store: MockDataStore) -> None:
    service = RequestService(store)
    rows = service.list_recent()
    assert rows
    assert all(isinstance(row, RequestSummary) for row in rows)
    # Summaries must not be the heavier detail model.
    assert not any(isinstance(row, RequestDetail) for row in rows)


def test_list_recent_is_bounded(store: MockDataStore) -> None:
    service = RequestService(store)
    assert len(service.list_recent(limit=2)) == 2


def test_list_recent_clamps_non_positive_limit(store: MockDataStore) -> None:
    service = RequestService(store)
    assert len(service.list_recent(limit=0)) == 1


def test_get_detail_returns_full_payload(store: MockDataStore) -> None:
    service = RequestService(store)
    target = store.list_requests(1)[0]
    detail = service.get_detail(target.request_id)
    assert isinstance(detail, RequestDetail)
    assert detail.request_id == target.request_id
    assert detail.prompt


def test_get_detail_unknown_raises(store: MockDataStore) -> None:
    service = RequestService(store)
    with pytest.raises(NotFoundError):
        service.get_detail("nope")
