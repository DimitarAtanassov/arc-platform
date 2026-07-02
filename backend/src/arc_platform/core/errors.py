"""Domain errors and the wire error envelope.

Clients and services raise these instead of importing FastAPI; the api/ layer
maps them to HTTP responses. This keeps HTTP concerns out of the lower layers and
lets us distinguish "missing" (404) from "downstream returned an error" (502) and
"downstream unreachable" (503) at the boundary.
"""

from __future__ import annotations

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Structured error envelope returned to the browser (never a stack trace)."""

    detail: str
    code: str


class NotFoundError(Exception):
    """Raised when a requested resource does not exist (-> 404)."""

    code = "not_found"

    def __init__(self, resource: str, identifier: str) -> None:
        self.resource = resource
        self.identifier = identifier
        super().__init__(f"{resource} '{identifier}' not found")


class UpstreamError(Exception):
    """Raised when arc-model-lab responds with an error we cannot fulfil (-> 502).

    Reads degrade to empty; a user-invoked action (inference) must fail loudly so
    the caller never mistakes a downstream failure for an empty result.
    """

    code = "upstream_error"

    def __init__(self, service: str, detail: str) -> None:
        self.service = service
        self.detail = detail
        super().__init__(f"{service}: {detail}")


class UpstreamUnavailableError(UpstreamError):
    """Raised when arc-model-lab is unreachable or times out (-> 503)."""

    code = "service_unavailable"
