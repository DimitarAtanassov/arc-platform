"""Service layer: serving + normalization logic for the BFF's read/write paths.

Routes must not reach past this layer into the client. Services shape data for
the UI and own any ordering/aggregation; the client owns I/O and normalization.
"""

from arc_platform.services.inference_service import InferenceService
from arc_platform.services.model_service import ModelService

__all__ = ["InferenceService", "ModelService"]
