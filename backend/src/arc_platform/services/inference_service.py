"""Inference serving logic for the BFF.

Read paths order and cap history; the write path forwards to arc-model-lab and
fails loudly. The BFF persists nothing of its own.
"""

from __future__ import annotations

from arc_platform.clients.model_lab_client import ModelLabClient
from arc_platform.schemas.inference import (
    InferenceDetail,
    InferenceRequest,
    InferenceSummary,
)


class InferenceService:
    """Runs inference through arc-model-lab and serves its history."""

    def __init__(self, *, client: ModelLabClient) -> None:
        self._client = client

    async def run_inference(self, request: InferenceRequest) -> InferenceDetail:
        """Run one inference and return the persisted record (fails loudly)."""
        return await self._client.run_inference(request)

    async def list_inferences(self, *, limit: int) -> list[InferenceSummary]:
        """Return recent runs, most recent first, capped at ``limit``."""
        runs = await self._client.list_inferences(limit=limit)
        runs.sort(key=lambda run: run.created_at, reverse=True)
        return runs[:limit]

    async def get_inference(self, inference_id: str) -> InferenceDetail:
        """Return one full inference record (raises NotFoundError if unknown)."""
        return await self._client.get_inference(inference_id)
