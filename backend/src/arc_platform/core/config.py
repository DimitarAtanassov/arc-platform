"""Application configuration.

All settings are overridable via ``ARC_PLATFORM_*`` environment variables. The
instance is frozen and cached so it can be shared safely and used as an
``lru_cache`` key elsewhere.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings for the arc-platform BFF."""

    model_config = SettingsConfigDict(env_prefix="ARC_PLATFORM_", frozen=True)

    app_name: str = "arc-platform"
    service_name: str = "arc-platform-bff"
    log_level: str = "INFO"

    # Mock data layer (MVP): seeded so the UI and tests are deterministic.
    mock_seed: int = 1337
    mock_request_count: int = 25

    # CORS origins allowed to call the BFF (the Next.js dev server by default).
    cors_origins: tuple[str, ...] = ("http://localhost:3000",)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached settings instance."""
    return Settings()
