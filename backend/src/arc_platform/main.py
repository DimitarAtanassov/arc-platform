"""FastAPI application assembly for the ARC Research Console BFF.

Wires the routers, cross-cutting middleware, and the exception handlers that map
domain errors onto safe HTTP responses. The browser talks only to this BFF; the
BFF talks only to arc-model-lab.
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from arc_platform import __version__
from arc_platform.api.routes import health, inference, models
from arc_platform.core.config import get_settings
from arc_platform.core.errors import (
    ErrorResponse,
    NotFoundError,
    UpstreamError,
    UpstreamUnavailableError,
)
from arc_platform.core.logging import configure_logging
from arc_platform.core.middleware import access_log_middleware
from arc_platform.core.telemetry import (
    get_logger,
    instrument_fastapi,
    instrument_httpx,
    setup_tracing,
)

logger = get_logger(__name__)

_HTTPX_INSTRUMENTED = False


def _instrument_httpx_once() -> None:
    """Instrument httpx exactly once (creating many apps in tests is common)."""
    global _HTTPX_INSTRUMENTED  # noqa: PLW0603 - module-level singleton guard
    if _HTTPX_INSTRUMENTED:
        return
    instrument_httpx()
    _HTTPX_INSTRUMENTED = True


def _error(status_code: int, detail: str, code: str) -> JSONResponse:
    """Build a structured error response with no stack trace."""
    return JSONResponse(
        status_code=status_code,
        content=ErrorResponse(detail=detail, code=code).model_dump(),
    )


def _register_error_handlers(app: FastAPI) -> None:
    """Map domain errors onto safe HTTP responses at the boundary."""

    @app.exception_handler(NotFoundError)
    async def _not_found(_request: Request, exc: NotFoundError) -> JSONResponse:
        logger.info(
            "resource.not_found", resource=exc.resource, identifier=exc.identifier
        )
        return _error(404, str(exc), exc.code)

    @app.exception_handler(UpstreamUnavailableError)
    async def _unavailable(
        _request: Request, exc: UpstreamUnavailableError
    ) -> JSONResponse:
        logger.warning("upstream.unavailable", service=exc.service, detail=exc.detail)
        return _error(503, str(exc), exc.code)

    @app.exception_handler(UpstreamError)
    async def _upstream(_request: Request, exc: UpstreamError) -> JSONResponse:
        logger.warning("upstream.error", service=exc.service, detail=exc.detail)
        return _error(502, str(exc), exc.code)

    @app.exception_handler(Exception)
    async def _unexpected(_request: Request, exc: Exception) -> JSONResponse:
        logger.error("unhandled.error", error=str(exc), error_type=type(exc).__name__)
        return _error(500, "internal server error", "internal_error")


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = get_settings()
    configure_logging(level=settings.log_level)
    setup_tracing(service_name=settings.service_name)

    app = FastAPI(
        title="ARC Research Console",
        version=__version__,
        summary=(
            "BFF for the ARC Research Console: model discovery and inference "
            "over arc-model-lab."
        ),
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )
    app.middleware("http")(access_log_middleware)
    _register_error_handlers(app)

    app.include_router(health.router)
    app.include_router(models.router)
    app.include_router(inference.router)

    instrument_fastapi(app, excluded_urls="health")
    _instrument_httpx_once()
    return app


app = create_app()
