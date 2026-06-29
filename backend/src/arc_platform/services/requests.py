"""Request aggregation service."""

from __future__ import annotations

from arc_platform.clients.eval_service import EvalReader
from arc_platform.schemas.models import RequestDetail, RequestSummary

DEFAULT_LIMIT = 50
MAX_LIMIT = 200


class RequestService:
    """Serves request list + detail views from the evaluator-backed reader."""

    def __init__(self, reader: EvalReader) -> None:
        self._reader = reader

    async def list_recent(self, limit: int = DEFAULT_LIMIT) -> list[RequestSummary]:
        """Return recent requests as lightweight summaries (most recent first)."""
        bounded = max(1, min(limit, MAX_LIMIT))
        return [
            RequestSummary.model_validate(request.model_dump())
            for request in await self._reader.list_requests(bounded)
        ]

    async def get_detail(self, request_id: str) -> RequestDetail:
        """Return the full inspection payload for one request."""
        return await self._reader.get_request(request_id)
