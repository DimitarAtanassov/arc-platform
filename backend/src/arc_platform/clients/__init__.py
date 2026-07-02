"""Outbound clients. The BFF's only downstream is arc-model-lab."""

from arc_platform.clients.model_lab_client import ModelLabClient

__all__ = ["ModelLabClient"]
