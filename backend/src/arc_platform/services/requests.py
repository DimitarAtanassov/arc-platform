"""Request aggregation service."""

from __future__ import annotations

from arc_platform.db.store import MockDataStore
from arc_platform.schemas.models import RequestDetail, RequestSummary

DEFAULT_LIMIT = 50
MAX_LIMIT = 200


class RequestService:
    """Serves request list + detail views from the data store."""

    def __init__(self, store: MockDataStore) -> None:
        self._store = store

    def list_recent(self, limit: int = DEFAULT_LIMIT) -> list[RequestSummary]:
        """Return recent requests as lightweight summaries (most recent first)."""
        bounded = max(1, min(limit, MAX_LIMIT))
        return [
            RequestSummary.model_validate(request.model_dump())
            for request in self._store.list_requests(bounded)
        ]

    def get_detail(self, request_id: str) -> RequestDetail:
        """Return the full inspection payload for one request."""
        return self._store.get_request(request_id)
