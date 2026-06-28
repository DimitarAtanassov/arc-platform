"""Data access layer.

For the MVP this is an in-memory store seeded with deterministic mock data.
Swapping it for a real backing store (e.g. reading traces from arc-gateway)
is a drop-in replacement: keep the same read methods and the service layer is
unchanged.
"""

from arc_platform.db.store import MockDataStore

__all__ = ["MockDataStore"]
