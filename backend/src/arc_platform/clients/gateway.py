"""Client for arc-gateway — the platform's inference write-path.

The Playground drives real inference through the gateway (provider + system
prompt + message), which scores online via the evaluator and emits the trace.
The BFF proxies to the gateway so the browser only ever talks to the platform
(one origin, no provider keys in the client).

The orchestrator/service depends on the :class:`GatewayPort` protocol, not this
concrete client, so tests inject a fake.
"""

from __future__ import annotations

from typing import Protocol

import httpx
from arc_telemetry import get_logger

from arc_platform.core.errors import UpstreamError
from arc_platform.schemas.models import InferRequest, InferResult, ProviderInfo

logger = get_logger(__name__)


class GatewayPort(Protocol):
    """What the platform needs from the gateway."""

    async def infer(self, request: InferRequest) -> InferResult: ...

    async def list_providers(self) -> list[ProviderInfo]: ...


class GatewayClient(GatewayPort):
    """HTTP client for arc-gateway's ``/v1/infer`` and ``/v1/providers``."""

    def __init__(self, *, base_url: str, timeout_s: float = 60.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout_s = timeout_s

    async def infer(self, request: InferRequest) -> InferResult:
        payload = {
            "prompt": request.prompt,
            "model": request.model,
            "system": request.system,
            "provider": request.provider,
        }
        try:
            async with httpx.AsyncClient(timeout=self._timeout_s) as client:
                resp = await client.post(f"{self._base_url}/v1/infer", json=payload)
                resp.raise_for_status()
                return InferResult.model_validate(resp.json())
        except httpx.HTTPStatusError as exc:
            detail = _detail(exc.response)
            logger.warning("gateway.infer_failed", status=exc.response.status_code)
            raise UpstreamError("gateway", detail) from exc
        except httpx.HTTPError as exc:
            logger.warning("gateway.unreachable", error=str(exc))
            raise UpstreamError("gateway", "gateway unreachable") from exc

    async def list_providers(self) -> list[ProviderInfo]:
        # Discovery degrades gracefully: an empty list still renders the screen.
        try:
            async with httpx.AsyncClient(timeout=self._timeout_s) as client:
                resp = await client.get(f"{self._base_url}/v1/providers")
                resp.raise_for_status()
                data = resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("gateway.providers_unreachable", error=str(exc))
            return []
        if not isinstance(data, list):
            return []
        return [ProviderInfo.model_validate(item) for item in data]


def _detail(response: httpx.Response) -> str:
    try:
        body = response.json()
        if isinstance(body, dict) and "detail" in body:
            return str(body["detail"])
    except ValueError:
        pass
    return f"gateway returned {response.status_code}"
