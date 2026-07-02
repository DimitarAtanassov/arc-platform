"""Liveness contract."""

from __future__ import annotations

from arc_platform.schemas.base import CamelModel


class HealthResponse(CamelModel):
    """Liveness response. Does not reflect downstream reachability."""

    status: str = "ok"
    service: str
    version: str
