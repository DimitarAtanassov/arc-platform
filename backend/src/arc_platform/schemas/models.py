"""Model-catalog contracts.

The BFF's public shape for the models arc-model-lab exposes. These are curated,
not a passthrough: the client maps arc-model-lab's snake_case records onto them.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import Field

from arc_platform.schemas.base import CamelModel


class ModelStatus(StrEnum):
    """Lifecycle state of a model in the catalog."""

    AVAILABLE = "available"
    PREVIEW = "preview"
    DEPRECATED = "deprecated"
    RETIRED = "retired"


class ModelSummary(CamelModel):
    """Row-level view of a model, as shown in the catalog table."""

    model_id: str
    display_name: str
    provider: str
    family: str | None = None
    status: ModelStatus = ModelStatus.AVAILABLE
    revision: str | None = None
    tokenizer_id: str | None = None
    adapter_path: str | None = None
    context_window: int | None = Field(default=None, ge=0)
    max_output_tokens: int | None = Field(default=None, ge=0)
    modalities: tuple[str, ...] = ()
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ModelDetail(ModelSummary):
    """Full model profile shown on the model detail surface."""

    description: str | None = None
    runtime_source: str | None = None
    capabilities: tuple[str, ...] = ()
