"""Shared test fixtures."""

from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient

from arc_platform.api.main import create_app
from arc_platform.core.deps import get_store
from arc_platform.db.store import MockDataStore


@pytest.fixture
def store() -> MockDataStore:
    """A small, deterministic store for unit tests."""
    return MockDataStore(seed=42, size=6)


@pytest.fixture
async def client(store: MockDataStore) -> AsyncGenerator[AsyncClient]:
    """An httpx AsyncClient bound to the ASGI app (no network).

    The data store is overridden with the deterministic fixture so API tests are
    independent of the process-wide seeded store.
    """
    app = create_app()
    app.dependency_overrides[get_store] = lambda: store
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client
    app.dependency_overrides.clear()
