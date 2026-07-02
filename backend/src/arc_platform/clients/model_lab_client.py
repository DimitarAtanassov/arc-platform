"""HTTP client for arc-model-lab, the BFF's only downstream.

arc-platform owns no database and no provider keys. It reads the model catalog
and inference history from arc-model-lab and drives new inference through it.
This module also NORMALIZES arc-model-lab's snake_case records into the BFF's
public (camelCase) contracts, so the browser sees one clean shape.

Failure policy:

- Catalog and history *reads* degrade gracefully: an unreachable arc-model-lab
  yields an empty list so the surface still renders.
- Single-resource reads raise :class:`NotFoundError` (404) or
  :class:`UpstreamUnavailableError` (unreachable) so callers can tell "missing"
  from "down".
- Inference (a user-invoked write) fails loudly: :class:`UpstreamError` for a bad
  response or :class:`UpstreamUnavailableError` when unreachable, never a silent
  empty.

There is deliberately no client Protocol: this is the single implementation, and
tests subclass it directly (YAGNI).
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import httpx

from arc_platform.core.errors import (
    NotFoundError,
    UpstreamError,
    UpstreamUnavailableError,
)
from arc_platform.core.telemetry import get_logger
from arc_platform.schemas.inference import (
    InferenceDetail,
    InferenceParams,
    InferenceRequest,
    InferenceStatus,
    InferenceSummary,
    TokenUsage,
)
from arc_platform.schemas.models import ModelDetail, ModelStatus, ModelSummary

logger = get_logger(__name__)

_SERVICE = "arc-model-lab"
_MODELS_PATH = "/v1/models"
_INFERENCE_PATH = "/v1/inference"
_PROMPT_PREVIEW_CHARS = 140


# --- pure mappers (arc-model-lab record -> BFF contract) ------------------


def _preview(text: str, limit: int = _PROMPT_PREVIEW_CHARS) -> str:
    """Collapse whitespace and truncate a prompt to a single-line table preview."""
    collapsed = " ".join(text.split())
    if len(collapsed) <= limit:
        return collapsed
    return collapsed[: limit - 1].rstrip() + "\u2026"


def _parse_dt(value: object) -> datetime | None:
    """Parse an ISO-8601 timestamp, tolerating missing or malformed values."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


def _str_tuple(value: object) -> tuple[str, ...]:
    """Coerce a downstream list into an immutable tuple of strings."""
    if isinstance(value, list):
        return tuple(str(item) for item in value)
    return ()


def _model_status(value: object) -> ModelStatus:
    """Map a downstream status string onto :class:`ModelStatus` (default available)."""
    try:
        return ModelStatus(str(value))
    except ValueError:
        return ModelStatus.AVAILABLE


def to_model_summary(record: dict[str, Any]) -> ModelSummary:
    """Map an arc-model-lab model record to a catalog row."""
    model_id = str(record["model_id"])
    return ModelSummary(
        model_id=model_id,
        display_name=str(record.get("display_name") or model_id),
        provider=str(record.get("provider") or "unknown"),
        family=record.get("family"),
        status=_model_status(record.get("status", ModelStatus.AVAILABLE)),
        revision=record.get("revision"),
        tokenizer_id=record.get("tokenizer_id"),
        adapter_path=record.get("adapter_path"),
        context_window=record.get("context_window"),
        max_output_tokens=record.get("max_output_tokens"),
        modalities=_str_tuple(record.get("modalities")),
        created_at=_parse_dt(record.get("created_at")),
        updated_at=_parse_dt(record.get("updated_at")),
    )


def to_model_detail(record: dict[str, Any]) -> ModelDetail:
    """Map an arc-model-lab model record to a full model profile.

    Reuses the summary mapping for the shared fields, then layers on the
    detail-only serving metadata.
    """
    summary = to_model_summary(record)
    return ModelDetail(
        **summary.model_dump(),
        description=record.get("description"),
        runtime_source=record.get("runtime_source"),
        capabilities=_str_tuple(record.get("capabilities")),
    )


def _infer_status(record: dict[str, Any]) -> InferenceStatus:
    """Map a status string, deriving from error/output when it is missing."""
    try:
        return InferenceStatus(str(record.get("status")))
    except ValueError:
        if record.get("error"):
            return InferenceStatus.FAILED
        if record.get("output_text") is not None:
            return InferenceStatus.SUCCEEDED
        return InferenceStatus.RUNNING


def _usage(record: dict[str, Any]) -> TokenUsage | None:
    """Map the downstream usage block, if present."""
    usage = record.get("usage")
    if not isinstance(usage, dict):
        return None
    return TokenUsage(
        prompt_tokens=int(usage.get("prompt_tokens") or 0),
        completion_tokens=int(usage.get("completion_tokens") or 0),
        total_tokens=int(usage.get("total_tokens") or 0),
    )


def _params(record: dict[str, Any]) -> InferenceParams:
    """Map the sampling parameters echoed back by arc-model-lab."""
    params = record.get("params")
    if not isinstance(params, dict):
        return InferenceParams()
    return InferenceParams(
        temperature=params.get("temperature"),
        max_tokens=params.get("max_tokens"),
        top_p=params.get("top_p"),
    )


def to_inference_summary(record: dict[str, Any]) -> InferenceSummary:
    """Map an arc-model-lab inference record to a history row."""
    usage = _usage(record)
    return InferenceSummary(
        inference_id=str(record["inference_id"]),
        model_id=str(record["model_id"]),
        status=_infer_status(record),
        created_at=_parse_dt(record.get("created_at")) or datetime.now(tz=UTC),
        latency_ms=record.get("latency_ms"),
        total_tokens=usage.total_tokens if usage else None,
        prompt_preview=_preview(str(record.get("prompt") or "")),
    )


def to_inference_detail(record: dict[str, Any]) -> InferenceDetail:
    """Map an arc-model-lab inference record to a full inference detail."""
    usage = _usage(record)
    prompt = str(record.get("prompt") or "")
    return InferenceDetail(
        inference_id=str(record["inference_id"]),
        model_id=str(record["model_id"]),
        status=_infer_status(record),
        created_at=_parse_dt(record.get("created_at")) or datetime.now(tz=UTC),
        latency_ms=record.get("latency_ms"),
        total_tokens=usage.total_tokens if usage else None,
        prompt_preview=_preview(prompt),
        prompt=prompt,
        system_prompt=record.get("system_prompt"),
        output=record.get("output_text"),
        finish_reason=record.get("finish_reason"),
        params=_params(record),
        usage=usage,
        error=record.get("error"),
    )


def _detail(response: httpx.Response) -> str:
    """Extract a safe, human-readable error detail from a downstream response."""
    try:
        body = response.json()
    except ValueError:
        return f"{_SERVICE} returned {response.status_code}"
    if isinstance(body, dict) and "detail" in body:
        return str(body["detail"])
    return f"{_SERVICE} returned {response.status_code}"


# --- HTTP client ----------------------------------------------------------


class ModelLabClient:
    """HTTP client for arc-model-lab's model catalog and inference endpoints."""

    def __init__(
        self,
        *,
        base_url: str,
        timeout_s: float = 15.0,
        inference_timeout_s: float = 120.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout_s = timeout_s
        self._inference_timeout_s = inference_timeout_s

    async def list_models(self) -> list[ModelSummary]:
        """Return the model catalog. Degrades to an empty list if unreachable."""
        data = await self._get_list(_MODELS_PATH)
        return [to_model_summary(item) for item in data if isinstance(item, dict)]

    async def get_model(self, model_id: str) -> ModelDetail:
        """Return one model's full profile (404 if unknown, 503 if unreachable)."""
        record = await self._get_one(
            f"{_MODELS_PATH}/{model_id}", resource="model", identifier=model_id
        )
        return to_model_detail(record)

    async def list_inferences(self, *, limit: int) -> list[InferenceSummary]:
        """Return recent inference runs. Degrades to empty if unreachable."""
        data = await self._get_list(_INFERENCE_PATH, params={"limit": limit})
        return [to_inference_summary(item) for item in data if isinstance(item, dict)]

    async def get_inference(self, inference_id: str) -> InferenceDetail:
        """Return one inference record (404 if unknown, 503 if unreachable)."""
        record = await self._get_one(
            f"{_INFERENCE_PATH}/{inference_id}",
            resource="inference",
            identifier=inference_id,
        )
        return to_inference_detail(record)

    async def run_inference(self, request: InferenceRequest) -> InferenceDetail:
        """Drive one inference through arc-model-lab and return the saved record."""
        payload = {
            "model_id": request.model_id,
            "prompt": request.prompt,
            "system_prompt": request.system_prompt,
            "params": request.params.model_dump(by_alias=False, exclude_none=True),
        }
        record = await self._post(_INFERENCE_PATH, payload, request.model_id)
        return to_inference_detail(record)

    async def _get_list(
        self, path: str, params: dict[str, str | int] | None = None
    ) -> list[Any]:
        try:
            async with httpx.AsyncClient(timeout=self._timeout_s) as client:
                resp = await client.get(f"{self._base_url}{path}", params=params)
                resp.raise_for_status()
                data = resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("model_lab.read_degraded", path=path, error=str(exc))
            return []
        return data if isinstance(data, list) else []

    async def _get_one(
        self, path: str, *, resource: str, identifier: str
    ) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=self._timeout_s) as client:
                resp = await client.get(f"{self._base_url}{path}")
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == httpx.codes.NOT_FOUND:
                raise NotFoundError(resource, identifier) from exc
            logger.warning(
                "model_lab.read_failed", path=path, status=exc.response.status_code
            )
            raise UpstreamError(_SERVICE, _detail(exc.response)) from exc
        except httpx.HTTPError as exc:
            logger.warning("model_lab.unreachable", path=path, error=str(exc))
            raise UpstreamUnavailableError(
                _SERVICE, f"{_SERVICE} is unreachable"
            ) from exc
        except ValueError as exc:
            logger.warning("model_lab.bad_json", path=path)
            raise UpstreamError(_SERVICE, f"invalid response from {_SERVICE}") from exc
        if not isinstance(data, dict):
            raise UpstreamError(_SERVICE, f"unexpected response shape from {_SERVICE}")
        return data

    async def _post(
        self, path: str, payload: dict[str, Any], model_id: str
    ) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=self._inference_timeout_s) as client:
                resp = await client.post(f"{self._base_url}{path}", json=payload)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == httpx.codes.NOT_FOUND:
                raise NotFoundError("model", model_id) from exc
            logger.warning(
                "model_lab.inference_failed", status=exc.response.status_code
            )
            raise UpstreamError(_SERVICE, _detail(exc.response)) from exc
        except httpx.HTTPError as exc:
            logger.warning("model_lab.inference_unreachable", error=str(exc))
            raise UpstreamUnavailableError(
                _SERVICE, f"{_SERVICE} is unreachable"
            ) from exc
        except ValueError as exc:
            logger.warning("model_lab.inference_bad_json")
            raise UpstreamError(_SERVICE, f"invalid response from {_SERVICE}") from exc
        if not isinstance(data, dict):
            raise UpstreamError(_SERVICE, f"unexpected response shape from {_SERVICE}")
        return data
