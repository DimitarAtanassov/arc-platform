"""Route definitions only.

Routes delegate straight to the service layer and shape nothing themselves. No
aggregation, no data access, no business logic.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from arc_platform.core.config import Settings, get_settings
from arc_platform.core.deps import (
    get_evaluation_service,
    get_request_service,
    get_trace_service,
)
from arc_platform.schemas.models import (
    EvaluationSummary,
    HealthResponse,
    RequestDetail,
    RequestSummary,
    Trace,
)
from arc_platform.services.evaluations import EvaluationService
from arc_platform.services.requests import RequestService
from arc_platform.services.traces import TraceService

router = APIRouter()

RequestServiceDep = Annotated[RequestService, Depends(get_request_service)]
TraceServiceDep = Annotated[TraceService, Depends(get_trace_service)]
EvaluationServiceDep = Annotated[EvaluationService, Depends(get_evaluation_service)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


@router.get("/health", response_model=HealthResponse, tags=["ops"])
async def health(settings: SettingsDep) -> HealthResponse:
    """Liveness probe."""
    return HealthResponse(status="ok", service=settings.service_name)


@router.get("/v1/requests", response_model=list[RequestSummary], tags=["requests"])
async def list_requests(
    service: RequestServiceDep,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[RequestSummary]:
    """List recent requests, most recent first."""
    return await service.list_recent(limit=limit)


@router.get(
    "/v1/requests/{request_id}", response_model=RequestDetail, tags=["requests"]
)
async def get_request(request_id: str, service: RequestServiceDep) -> RequestDetail:
    """Return the full inspection payload for one request."""
    return await service.get_detail(request_id)


@router.get("/v1/traces/{trace_id}", response_model=Trace, tags=["traces"])
async def get_trace(trace_id: str, service: TraceServiceDep) -> Trace:
    """Return the full span tree for a trace."""
    return await service.get_trace(trace_id)


@router.get(
    "/v1/evaluations/summary", response_model=EvaluationSummary, tags=["evaluations"]
)
async def evaluation_summary(service: EvaluationServiceDep) -> EvaluationSummary:
    """Return the aggregated evaluation dashboard summary."""
    return await service.summary()
