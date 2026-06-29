"""Domain errors.

Services raise these instead of importing FastAPI; the api/ layer maps them to
HTTP responses. This keeps HTTP concerns out of the service and data layers.
"""

from __future__ import annotations


class NotFoundError(Exception):
    """Raised when a requested resource does not exist."""

    def __init__(self, resource: str, identifier: str) -> None:
        self.resource = resource
        self.identifier = identifier
        super().__init__(f"{resource} '{identifier}' not found")


class UpstreamError(Exception):
    """Raised when an upstream service (e.g. the gateway) fails a write call.

    Unlike reads (which degrade to empty), an action the user invoked must fail
    loudly; the api/ layer maps this to a 502.
    """

    def __init__(self, service: str, detail: str) -> None:
        self.service = service
        self.detail = detail
        super().__init__(f"{service}: {detail}")
