"""FastAPI application assembly + cross-cutting middleware/handlers."""

from __future__ import annotations

import logging

from arc_telemetry import instrument_fastapi, instrument_httpx, setup_tracing
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from arc_platform.api.routes import router
from arc_platform.core.config import get_settings
from arc_platform.core.errors import NotFoundError
from arc_platform.core.logging import configure_logging
from arc_platform.core.middleware import access_log_middleware

logger = logging.getLogger("arc_platform.api")

_HTTPX_INSTRUMENTED = False


def _instrument_httpx_once() -> None:
    """Instrument httpx exactly once (creating many apps in tests is common)."""
    global _HTTPX_INSTRUMENTED  # noqa: PLW0603 - module-level singleton guard
    if _HTTPX_INSTRUMENTED:
        return
    instrument_httpx()
    _HTTPX_INSTRUMENTED = True


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = get_settings()
    configure_logging(level=settings.log_level)
    setup_tracing(service_name=settings.service_name)

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        summary="BFF for the ARC control plane: trace, request and evaluation views.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_methods=["GET"],
        allow_headers=["*"],
    )
    app.middleware("http")(access_log_middleware)

    @app.exception_handler(NotFoundError)
    async def _not_found_handler(_request: Request, exc: NotFoundError) -> JSONResponse:
        logger.info(
            "resource not found",
            extra={"resource": exc.resource, "identifier": exc.identifier},
        )
        return JSONResponse(
            status_code=404,
            content={"detail": str(exc)},
        )

    app.include_router(router)
    instrument_fastapi(app, excluded_urls="health")
    _instrument_httpx_once()
    return app


app = create_app()
