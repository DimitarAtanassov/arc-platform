"""Discovery serving service: judges and model profiles.

A thin passthrough over the evaluator's discovery endpoints (``/v1/judges`` and
``/v1/models``) so the console can render the Judges screen and surface the
configured judge-model profiles without holding any of it itself.
"""

from __future__ import annotations

from arc_platform.clients.eval_service import EvalReader
from arc_platform.schemas.models import Judge, ModelProfile


class DiscoveryService:
    """Serves the registered judges and configured model profiles."""

    def __init__(self, reader: EvalReader) -> None:
        self._reader = reader

    async def judges(self) -> list[Judge]:
        """List the judges registered on the evaluator."""
        return await self._reader.list_judges()

    async def models(self) -> list[ModelProfile]:
        """List the configured judge-model profiles (no secrets)."""
        return await self._reader.list_models()
