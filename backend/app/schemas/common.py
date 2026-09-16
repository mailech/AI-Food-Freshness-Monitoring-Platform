"""Shared response envelopes and pagination schemas."""

from __future__ import annotations

import math
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ORMModel(BaseModel):
    """Base for schemas populated from SQLAlchemy objects."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class Message(BaseModel):
    success: bool = True
    message: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None


class ErrorResponse(BaseModel):
    """The platform's uniform error envelope."""

    success: bool = False
    error: ErrorDetail

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": False,
                "error": {
                    "code": "INVALID_IMAGE",
                    "message": "The uploaded file is not a supported image.",
                },
            }
        }
    )


class PageMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool


class Page(BaseModel, Generic[T]):
    """Paginated list response used by every collection endpoint."""

    items: list[T]
    meta: PageMeta

    @classmethod
    def build(cls, items: list[T], *, total: int, page: int, page_size: int) -> "Page[T]":
        total_pages = max(1, math.ceil(total / page_size)) if page_size else 1
        return cls(
            items=items,
            meta=PageMeta(
                page=page,
                page_size=page_size,
                total=total,
                total_pages=total_pages,
                has_next=page < total_pages,
                has_prev=page > 1,
            ),
        )


class IdResponse(BaseModel):
    id: int


class CountResponse(BaseModel):
    count: int


class SortParams(BaseModel):
    sort_by: str | None = Field(default=None, description="Field name to sort by")
    sort_dir: str = Field(default="desc", pattern="^(asc|desc)$")
