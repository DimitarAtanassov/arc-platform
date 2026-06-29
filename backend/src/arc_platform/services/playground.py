"""Playground service: drive inference through the gateway.

A thin orchestration seam over the gateway client so the api/ layer stays free
of HTTP concerns and the gateway stays swappable in tests. This is the platform's
only write path — everything else reads from the evaluator.
"""

from __future__ import annotations

from arc_platform.clients.gateway import GatewayPort
from arc_platform.schemas.models import InferRequest, InferResult, ProviderInfo


class PlaygroundService:
    """Serves the Playground: provider discovery + inference."""

    def __init__(self, gateway: GatewayPort) -> None:
        self._gateway = gateway

    async def providers(self) -> list[ProviderInfo]:
        """List the providers the gateway can serve (with configured flags)."""
        return await self._gateway.list_providers()

    async def infer(self, request: InferRequest) -> InferResult:
        """Run one inference request through the gateway."""
        return await self._gateway.infer(request)
