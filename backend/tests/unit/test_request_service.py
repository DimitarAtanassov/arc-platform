"""Unit tests for the request service (fake evaluator-backed reader)."""

import pytest

from arc_platform.clients.eval_service import EvalReader
from arc_platform.core.errors import NotFoundError
from arc_platform.schemas.models import RequestDetail, RequestSummary
from arc_platform.services.requests import RequestService

pytestmark = pytest.mark.unit


async def test_list_recent_returns_summaries(reader: EvalReader) -> None:
    service = RequestService(reader)
    rows = await service.list_recent()
    assert rows
    assert all(isinstance(row, RequestSummary) for row in rows)
    assert not any(isinstance(row, RequestDetail) for row in rows)


async def test_list_recent_is_bounded(reader: EvalReader) -> None:
    service = RequestService(reader)
    assert len(await service.list_recent(limit=2)) == 2


async def test_list_recent_clamps_non_positive_limit(reader: EvalReader) -> None:
    service = RequestService(reader)
    assert len(await service.list_recent(limit=0)) == 1


async def test_get_detail_returns_full_payload(reader: EvalReader) -> None:
    service = RequestService(reader)
    target = (await service.list_recent(1))[0]
    detail = await service.get_detail(target.request_id)
    assert isinstance(detail, RequestDetail)
    assert detail.request_id == target.request_id
    assert detail.prompt


async def test_get_detail_unknown_raises(reader: EvalReader) -> None:
    service = RequestService(reader)
    with pytest.raises(NotFoundError):
        await service.get_detail("nope")
