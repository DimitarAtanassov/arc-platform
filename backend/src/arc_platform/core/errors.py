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
