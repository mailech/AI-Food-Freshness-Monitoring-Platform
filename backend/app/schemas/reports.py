"""Request and response schemas for stored report snapshots."""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, model_validator

from app.models.enums import ReportType


class ReportCreate(BaseModel):
    """Report type and optional source-data date range."""

    report_type: ReportType
    date_from: date | None = None
    date_to: date | None = None

    @model_validator(mode="after")
    def validate_date_range(self) -> "ReportCreate":
        if self.date_from and self.date_to and self.date_from > self.date_to:
            raise ValueError("date_from cannot be after date_to.")
        return self


class ReportResponse(BaseModel):
    """Safe stored report snapshot; export references remain nullable."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    report_type: ReportType
    date_from: date | None
    date_to: date | None
    record_count: int
    report_data: dict[str, Any] | None
    status: str
    generated_at: datetime
    pdf_file_reference: str | None
    excel_file_reference: str | None
