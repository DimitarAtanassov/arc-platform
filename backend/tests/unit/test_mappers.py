"""Unit tests for the pure record -> contract mappers (fallback branches)."""

from __future__ import annotations

import pytest

from arc_platform.clients.model_lab_client import (
    _preview,
    to_inference_detail,
    to_inference_summary,
    to_model_detail,
    to_model_summary,
)
from arc_platform.schemas.inference import InferenceStatus
from arc_platform.schemas.models import ModelStatus

pytestmark = pytest.mark.unit


def test_model_summary_defaults_from_minimal_record() -> None:
    model = to_model_summary({"model_id": "solo"})
    assert model.display_name == "solo"
    assert model.provider == "unknown"
    assert model.status is ModelStatus.AVAILABLE
    assert model.modalities == ()


def test_model_status_invalid_falls_back_to_available() -> None:
    model = to_model_summary({"model_id": "x", "status": "bogus"})
    assert model.status is ModelStatus.AVAILABLE


def test_model_detail_bad_timestamp_becomes_none() -> None:
    detail = to_model_detail({"model_id": "x", "created_at": "not-a-date"})
    assert detail.created_at is None
    assert detail.capabilities == ()


def test_inference_status_derived_from_output_when_missing() -> None:
    summary = to_inference_summary(
        {"inference_id": "i", "model_id": "m", "output_text": "hi"}
    )
    assert summary.status is InferenceStatus.SUCCEEDED


def test_inference_status_failed_from_error() -> None:
    detail = to_inference_detail(
        {"inference_id": "i", "model_id": "m", "error": "boom"}
    )
    assert detail.status is InferenceStatus.FAILED
    assert detail.error == "boom"
    assert detail.usage is None
    assert detail.params.temperature is None


def test_inference_status_running_without_signals() -> None:
    detail = to_inference_detail({"inference_id": "i", "model_id": "m"})
    assert detail.status is InferenceStatus.RUNNING


def test_usage_and_params_mapped() -> None:
    detail = to_inference_detail(
        {
            "inference_id": "i",
            "model_id": "m",
            "status": "succeeded",
            "output_text": "o",
            "usage": {
                "prompt_tokens": 1,
                "completion_tokens": 2,
                "total_tokens": 3,
            },
            "params": {"temperature": 0.5, "max_tokens": 8, "top_p": 0.9},
        }
    )
    assert detail.usage is not None
    assert detail.usage.total_tokens == 3
    assert detail.total_tokens == 3
    assert detail.params.max_tokens == 8


def test_preview_collapses_whitespace_and_truncates() -> None:
    assert _preview("a\n  b   c") == "a b c"
    truncated = _preview("x " * 200)
    assert len(truncated) <= 140
    assert truncated.endswith("\u2026")
