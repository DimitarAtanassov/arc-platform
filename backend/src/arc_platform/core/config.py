"""Application configuration.

All settings are overridable via ``ARC_PLATFORM_*`` environment variables. The
instance is frozen and cached so it can be shared safely and used as an
``lru_cache`` key elsewhere.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings for the ARC Research Console BFF."""

    model_config = SettingsConfigDict(
        env_prefix="ARC_PLATFORM_", frozen=True, protected_namespaces=()
    )

    app_name: str = "arc-research-console"
    service_name: str = "arc-platform-bff"
    log_level: str = "INFO"

    # The only downstream the BFF talks to. arc-platform owns no database and no
    # provider keys: it reads the model catalog and drives inference through
    # arc-model-lab, which persists every run.
    model_lab_url: str = "http://localhost:8000"
    model_lab_timeout_s: float = 15.0
    model_lab_inference_timeout_s: float = 120.0

    # CORS origins allowed to call the BFF (the Next.js dev server by default).
    cors_origins: tuple[str, ...] = ("http://localhost:3000",)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached settings instance."""
    return Settings()
