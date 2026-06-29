"""Outbound clients. The platform reads its data from the evaluator's API."""

from __future__ import annotations

from arc_platform.clients.eval_service import EvalReader, EvalServiceClient

__all__ = ["EvalReader", "EvalServiceClient"]
