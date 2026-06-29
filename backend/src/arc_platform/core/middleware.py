"""Request correlation + access logging.

Every request gets a request id (reused from an inbound ``X-Request-ID`` if
present) and emits exactly one structured access log line with method, path,
status and latency. The id is echoed back so callers can correlate.
"""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import Request, Response

logger = logging.getLogger("arc_platform.access")

REQUEST_ID_HEADER = "X-Request-ID"

type CallNext = Callable[[Request], Awaitable[Response]]


async def access_log_middleware(request: Request, call_next: CallNext) -> Response:
    """Tag each request with an id and log its outcome once."""
    request_id = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

    response.headers[REQUEST_ID_HEADER] = request_id
    logger.info(
        "request handled",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "latency_ms": elapsed_ms,
        },
    )
    return response
