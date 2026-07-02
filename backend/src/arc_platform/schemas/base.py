"""Shared Pydantic base for the BFF's public API contracts.

The browser talks only to this BFF, so its wire contract is camelCase (idiomatic
for the TypeScript frontend) even though arc-model-lab speaks snake_case. The
client layer maps downstream snake_case records onto these models and FastAPI
serializes them back to camelCase by alias, so the browser sees one clean shape.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Frozen value-object base whose fields serialize to camelCase.

    ``populate_by_name`` keeps snake_case construction working from Python and in
    tests, while ``protected_namespaces=()`` allows the domain's ``model_*``
    fields (``model_id``) without Pydantic's reserved-namespace warning.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        protected_namespaces=(),
        frozen=True,
    )
