"""Base repository.

Keeps query construction out of routers and gives every collection endpoint the
same pagination and sorting semantics. All filtering goes through SQLAlchemy
expressions, so user input is always parameterised (no string SQL anywhere).
"""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    model: type[ModelT]
    # Columns a client is allowed to sort by (prevents arbitrary attribute access).
    sortable_fields: set[str] = {"id", "created_at", "updated_at"}
    default_sort: str = "created_at"

    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------- reading
    def get(self, entity_id: int) -> ModelT | None:
        return self.db.get(self.model, entity_id)

    def get_or_404(self, entity_id: int, name: str | None = None) -> ModelT:
        entity = self.get(entity_id)
        if entity is None:
            label = name or self.model.__name__
            raise NotFoundError(f"{label} {entity_id} was not found.", code="NOT_FOUND")
        return entity

    def count(self, stmt: Select | None = None) -> int:
        if stmt is None:
            return int(self.db.scalar(select(func.count()).select_from(self.model)) or 0)
        subquery = stmt.order_by(None).limit(None).offset(None).subquery()
        return int(self.db.scalar(select(func.count()).select_from(subquery)) or 0)

    # ------------------------------------------------------------- sorting
    def apply_sort(self, stmt: Select, sort_by: str | None, sort_dir: str = "desc") -> Select:
        field = (sort_by or self.default_sort).strip()
        if field not in self.sortable_fields:
            field = self.default_sort
        column = getattr(self.model, field, None)
        if column is None:
            column = getattr(self.model, "id")
        ordering = column.asc() if str(sort_dir).lower() == "asc" else column.desc()
        # Stable secondary sort so pagination never repeats or drops rows.
        return stmt.order_by(ordering, getattr(self.model, "id").desc())

    def paginate(
        self, stmt: Select, *, page: int = 1, page_size: int = 20
    ) -> tuple[list[ModelT], int]:
        total = self.count(stmt)
        offset = max(0, (page - 1) * page_size)
        rows = self.db.scalars(stmt.limit(page_size).offset(offset)).unique().all()
        return list(rows), total

    # ------------------------------------------------------------- writing
    def create(self, **values: Any) -> ModelT:
        entity = self.model(**values)
        self.db.add(entity)
        self.db.flush()
        return entity

    def add(self, entity: ModelT) -> ModelT:
        self.db.add(entity)
        self.db.flush()
        return entity

    def update(self, entity: ModelT, values: dict[str, Any]) -> ModelT:
        for key, value in values.items():
            if hasattr(entity, key):
                setattr(entity, key, value)
        self.db.flush()
        return entity

    def delete(self, entity: ModelT) -> None:
        self.db.delete(entity)
        self.db.flush()
