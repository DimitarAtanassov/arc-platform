"""Telemetry seam.

Prefer the shared ``arc_telemetry`` SDK when it is installed. Fall back to stdlib
logging and no-op tracing so the BFF still runs where the private SDK cannot be
resolved (fresh clones behind a proxy, minimal CI images). The call surface
mirrors the subset of ``arc_telemetry`` the app uses, so callers import from here
and never branch on availability themselves.
"""

from __future__ import annotations

import logging
from typing import Protocol, cast

from fastapi import FastAPI

try:  # pragma: no cover - which branch runs depends on the environment
    from arc_telemetry import get_logger as _sdk_get_logger
    from arc_telemetry import instrument_fastapi as _sdk_instrument_fastapi
    from arc_telemetry import instrument_httpx as _sdk_instrument_httpx
    from arc_telemetry import setup_tracing as _sdk_setup_tracing

    _HAS_SDK = True
except ModuleNotFoundError:  # pragma: no cover
    _HAS_SDK = False


class StructuredLogger(Protocol):
    """Typed logging surface shared by the SDK logger and the stdlib fallback."""

    def debug(self, event: str, **fields: object) -> None: ...
    def info(self, event: str, **fields: object) -> None: ...
    def warning(self, event: str, **fields: object) -> None: ...
    def error(self, event: str, **fields: object) -> None: ...


class _StructuredLogger:
    """Give stdlib logging ``arc_telemetry``'s kwargs-as-structured-fields API.

    Extra keyword arguments are promoted to fields by the JSON formatter in
    :mod:`arc_platform.core.logging`, so ``logger.warning("event", key=value)``
    produces one structured line.
    """

    def __init__(self, name: str) -> None:
        self._log = logging.getLogger(name)

    def debug(self, event: str, **fields: object) -> None:
        self._log.debug(event, extra=fields)

    def info(self, event: str, **fields: object) -> None:
        self._log.info(event, extra=fields)

    def warning(self, event: str, **fields: object) -> None:
        self._log.warning(event, extra=fields)

    def error(self, event: str, **fields: object) -> None:
        self._log.error(event, extra=fields)


def get_logger(name: str) -> StructuredLogger:
    """Return a structured logger (``arc_telemetry``'s when available)."""
    if _HAS_SDK:
        return cast(StructuredLogger, _sdk_get_logger(name))
    return _StructuredLogger(name)


def setup_tracing(*, service_name: str) -> None:
    """Configure distributed tracing when the SDK is present; else a no-op."""
    if _HAS_SDK:
        _sdk_setup_tracing(service_name=service_name)


def instrument_fastapi(app: FastAPI, *, excluded_urls: str | None = None) -> None:
    """Instrument the ASGI app when the SDK is present; else a no-op."""
    if _HAS_SDK:
        _sdk_instrument_fastapi(app, excluded_urls=excluded_urls)


def instrument_httpx() -> None:
    """Instrument outbound httpx clients when the SDK is present; else a no-op."""
    if _HAS_SDK:
        _sdk_instrument_httpx()
