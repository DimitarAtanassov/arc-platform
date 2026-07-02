"""Model-catalog serving logic for the BFF.

The service owns serving policy (ordering) so routes stay trivial and the client
stays focused on I/O plus normalization.
"""

from __future__ import annotations

from arc_platform.clients.model_lab_client import ModelLabClient
from arc_platform.schemas.models import ModelDetail, ModelSummary


class ModelService:
    """Serves the model catalog from arc-model-lab."""

    def __init__(self, *, client: ModelLabClient) -> None:
        self._client = client

    async def list_models(self) -> list[ModelSummary]:
        """Return the catalog ordered by provider, then display name.

        A stable order keeps the catalog table deterministic across reloads.
        """
        models = await self._client.list_models()
        return sorted(
            models, key=lambda m: (m.provider.casefold(), m.display_name.casefold())
        )

    async def get_model(self, model_id: str) -> ModelDetail:
        """Return one model's full profile (raises NotFoundError if unknown)."""
        return await self._client.get_model(model_id)
